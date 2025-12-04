import { redirect } from 'next/navigation';

export default async function RegisterPage() {
  // OTP login handles both login and registration
  redirect('/login');
}
