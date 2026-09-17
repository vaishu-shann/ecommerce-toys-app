import { RegisterForm } from '@/components/account/RegisterForm';
import { AuthStage } from '@/components/AuthStage';

/** The registration page — a thin server shell over the client form, on the same stage as sign-in. */
export const metadata = { title: 'Create an account' };

export default function RegisterPage() {
  return (
    <AuthStage>
      <RegisterForm />
    </AuthStage>
  );
}
