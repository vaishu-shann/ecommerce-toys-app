import { type FirebaseApp, getApps, initializeApp } from 'firebase/app';
import {
  type Auth,
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { type Firestore, connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

import { classifyIdentifier, normalizeEmail, normalizePhone, toAuthEmail } from '@romp/core';

import {
  EMULATOR_API_KEY,
  connectAuthToEmulator,
  connectFirestoreToEmulator,
  emulatorConfig,
  isEmulatorWired,
} from './firebase-emulator';

/**
 * The **client** Firebase SDK for the browser.
 *
 * Separate from the server data layer (`src/server/*`, Admin SDK) in every way: this runs
 * in the browser, reads under security rules, and holds only the public web config. It
 * exists for the two things a page cannot do server-side — a realtime `onSnapshot`
 * subscription (the notification bell) and the customer's own scoped reads/writes.
 *
 * The config is `NEXT_PUBLIC_*` because it is genuinely public: a Firebase web config is not
 * a secret — security rules, not config obscurity, are what protect the data. Absent config
 * (local dev without it, or a build with none) leaves `firestoreClient()` returning null, so
 * a feature that needs it degrades to its signed-out state rather than throwing.
 *
 * In emulator mode (`NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true`) a synthetic config is used
 * instead, so local E2E needs no real Firebase project: the emulator ignores the API key and
 * app ID entirely, and the connect calls in the getters below route the SDK to the local
 * emulator. See `firebase-emulator.ts`.
 */

interface WebConfig {
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
  readonly appId: string;
}

/**
 * A synthetic config for emulator mode. The emulator validates none of these; the project ID
 * must match the emulator's own project so the client and the seeded data share it. The
 * orchestrator sets `NEXT_PUBLIC_FIREBASE_PROJECT_ID`; the fallback derives a `demo-<store>`
 * project from the store id so nothing brand-specific is hardcoded here.
 */
function emulatorWebConfig(): WebConfig {
  const storeId = process.env.NEXT_PUBLIC_STORE_ID ?? 'store';
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? `demo-${storeId}`;
  return {
    apiKey: EMULATOR_API_KEY,
    authDomain: `${projectId}.firebaseapp.com`,
    projectId,
    appId: 'emulator-app-id',
  };
}

/** Reads the web config from the environment, or null when it is not configured. */
function webConfig(): WebConfig | null {
  // Emulator mode does not need a real web config — the emulator ignores it — so a synthetic
  // one keeps `clientApp()` non-null and lets the connect calls take over.
  if (emulatorConfig().enabled) return emulatorWebConfig();

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  if (
    apiKey === undefined ||
    projectId === undefined ||
    appId === undefined ||
    authDomain === undefined
  ) {
    return null;
  }
  return { apiKey, authDomain, projectId, appId };
}

/**
 * Survives Next hot reload. Module-level `let`s reset when this file is replaced, but
 * `getAuth` on the default app may already have talked to production — and the Auth SDK
 * then refuses `connectAuthEmulator`. Listeners in `AuthProvider` are registered once, so
 * they must live here too or a later sign-in would succeed on a new Auth object the header
 * never sees.
 */
interface ClientRuntime {
  app: FirebaseApp | undefined;
  auth: Auth | undefined;
  db: Firestore | undefined;
  emulatorGeneration: number;
  uidListeners: Set<(uid: string | null) => void>;
  stopUid: (() => void) | undefined;
}

function runtime(): ClientRuntime {
  const owner = globalThis as { __rompFirebase?: ClientRuntime };
  owner.__rompFirebase ??= {
    app: undefined,
    auth: undefined,
    db: undefined,
    emulatorGeneration: 0,
    uidListeners: new Set(),
    stopUid: undefined,
  };
  return owner.__rompFirebase;
}

function namedApp(config: WebConfig, name: string): FirebaseApp {
  return getApps().find((candidate) => candidate.name === name) ?? initializeApp(config, name);
}

function wireAuth(instance: Auth): void {
  connectAuthToEmulator(instance, (authInstance, url, options) => {
    connectAuthEmulator(authInstance as Auth, url, options);
  });
}

function listenForUid(client: Auth): void {
  const slot = runtime();
  slot.stopUid?.();
  slot.stopUid = onAuthStateChanged(client, (user) => {
    const uid = user?.uid ?? null;
    for (const listener of slot.uidListeners) listener(uid);
  });
}

/** The memoised client app, or null when no web config is present. */
export function clientApp(): FirebaseApp | null {
  const slot = runtime();
  if (slot.app !== undefined) return slot.app;
  const config = webConfig();
  if (config === null) return null;
  slot.app = emulatorConfig().enabled
    ? namedApp(config, 'romp-emulator')
    : (getApps()[0] ?? initializeApp(config));
  return slot.app;
}

/**
 * The memoised client Firestore, or null when the SDK is not configured.
 *
 * Callers must handle null: it is the honest state of a store before its web config is
 * wired, and it keeps the notification bell rendering its signed-out affordance rather than
 * crashing.
 */
export function firestoreClient(): Firestore | null {
  const configured = clientApp();
  if (configured === null) return null;
  const slot = runtime();
  if (slot.db === undefined) slot.db = getFirestore(configured);
  connectFirestoreToEmulator(slot.db, (instance, host, port) => {
    connectFirestoreEmulator(instance as Firestore, host, port);
  });
  return slot.db;
}

/**
 * The memoised client Auth, or null when the SDK is not configured.
 *
 * Centralised so the emulator connect happens exactly once, before any sign-in: the Auth SDK
 * throws if `connectAuthEmulator` runs twice, so every `getAuth` call site in this module
 * goes through here rather than calling `getAuth` directly. A no-op wiring when the flag is
 * off leaves the real Firebase Auth in place.
 *
 * When emulator mode turns on after Auth already made a production call (typical Next HMR),
 * the default app cannot be rewired. A named app is minted instead and uid listeners move
 * with it, so register → sign-in and the account header share one session.
 */
function authClient(): Auth | null {
  const config = webConfig();
  if (config === null) return null;
  const slot = runtime();
  const useEmulator = emulatorConfig().enabled;

  if (slot.auth === undefined) {
    const configured = clientApp();
    if (configured === null) return null;
    slot.auth = getAuth(configured);
  }

  if (!useEmulator) return slot.auth;

  try {
    wireAuth(slot.auth);
  } catch {
    return mintEmulatorAuth(config);
  }
  if (!isEmulatorWired(slot.auth)) {
    return mintEmulatorAuth(config);
  }
  return slot.auth;
}

function mintEmulatorAuth(config: WebConfig): Auth {
  const slot = runtime();
  slot.emulatorGeneration += 1;
  const name = `romp-emulator-${String(slot.emulatorGeneration)}`;
  const fresh = namedApp(config, name);
  const instance = getAuth(fresh);
  wireAuth(instance);
  slot.app = fresh;
  slot.db = undefined;
  slot.auth = instance;
  if (slot.uidListeners.size > 0) listenForUid(instance);
  return instance;
}

/**
 * The signed-in customer's Firebase ID token, or null when nobody is signed in.
 *
 * The API's protected routes — the checkout quote and order placement — verify a bearer ID token
 * on every request, so a client that writes through them must attach a fresh one. `getIdToken`
 * returns the cached token and refreshes it transparently when it is close to expiry, so callers do
 * not manage token lifetime themselves. Returns null when the SDK is unconfigured or no user is
 * signed in, which lets the checkout page render its signed-out affordance rather than throwing —
 * the same graceful-degradation contract the rest of this module keeps until client auth (Task 20)
 * gives the storefront a real sign-in surface.
 */
export async function idToken(): Promise<string | null> {
  const client = authClient();
  if (client === null) return null;
  const { currentUser } = client;
  if (currentUser === null) return null;
  return currentUser.getIdToken();
}

/** The signed-in customer's uid, or null. Used to scope the customer's own client reads. */
export function currentUid(): string | null {
  const client = authClient();
  if (client === null) return null;
  return client.currentUser?.uid ?? null;
}

/**
 * Subscribes to sign-in changes, invoking `listener` with the current uid (or null) now and on
 * every change. Returns an unsubscribe. A no-op returning a no-op when the SDK is unconfigured, so
 * a component effect can wire it unconditionally and simply see "signed out" until auth is set up.
 */
export function onUidChanged(listener: (uid: string | null) => void): () => void {
  const slot = runtime();
  const client = authClient();
  slot.uidListeners.add(listener);
  if (client === null) {
    listener(null);
    return () => {
      slot.uidListeners.delete(listener);
    };
  }
  if (slot.stopUid === undefined) listenForUid(client);
  else listener(client.currentUser?.uid ?? null);
  return () => {
    slot.uidListeners.delete(listener);
  };
}

/** Whether client auth is configured — false in a build with no web config. */
export function authConfigured(): boolean {
  return clientApp() !== null;
}

/**
 * Signs a customer in with an email or a mobile number and a password.
 *
 * The identifier is whatever they typed — an email or a phone in any spelling. It is classified and
 * normalised with the **same** `@romp/core` helpers the server used at registration, so the login
 * alias derived here matches the Auth account exactly: an email lowercases and trims, a mobile
 * becomes the internal `p.<e164>@auth.<store>.internal` alias. Firebase then verifies the password.
 *
 * `storeId` and `defaultRegion` come from the store config the caller holds — a mobile alias is
 * store-scoped, and a bare 10-digit number needs a region to become E.164.
 */
export async function signInWithIdentifier(
  identifier: string,
  password: string,
  options: { readonly storeId: string; readonly defaultRegion: string },
): Promise<void> {
  const client = authClient();
  if (client === null) {
    throw new Error('Sign-in is not available: the store’s web config is not set.');
  }

  const loginEmail =
    classifyIdentifier(identifier) === 'email'
      ? normalizeEmail(identifier)
      : toAuthEmail(normalizePhone(identifier, options.defaultRegion), options.storeId);

  await signInWithEmailAndPassword(client, loginEmail, password);
}

/**
 * Signs in with the Auth login email the register API just returned.
 *
 * After registration the server is the source of the login alias (real email, or the phone
 * alias). Using that string rather than re-deriving it from what the customer typed avoids
 * a mismatch that creates the account and then fails to sign in.
 */
export async function signInWithLoginEmail(loginEmail: string, password: string): Promise<void> {
  const client = authClient();
  if (client === null) {
    throw new Error('Sign-in is not available: the store’s web config is not set.');
  }
  await signInWithEmailAndPassword(client, loginEmail, password);
}

/**
 * Signs the customer out.
 *
 * `IDENTITY.md § sessions`: sign-out clears the session and detaches Firestore listeners. The
 * listener teardown is owned by each subscription (the notification bell tears its `onSnapshot` down
 * when the uid goes null), so here it is enough to end the Auth session — `onUidChanged` then fires
 * `null` and every subscription unwinds.
 */
export async function signOutCustomer(): Promise<void> {
  const client = authClient();
  if (client === null) return;
  await signOut(client);
}
