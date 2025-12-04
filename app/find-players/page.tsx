import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import FindPlayersClient from '@/components/FindPlayersClient';

export default async function FindPlayersPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/login');
  }

  return <FindPlayersClient />;
}

