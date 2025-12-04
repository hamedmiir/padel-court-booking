import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import LoginForm from '@/components/LoginForm';

export default async function LoginPage() {
  const session = await auth();

  if (session) {
    redirect('/');
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6 text-center border-b pb-4">
        ورود به سیستم
      </h1>
      <LoginForm />
    </div>
  );
}

