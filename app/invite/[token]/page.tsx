import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { acceptInvitation } from '@/app/actions/booking';
import InvitePageClient from '@/components/InvitePageClient';

export default async function InvitePage({
  params,
}: {
  params: { token: string };
}) {
  const session = await auth();
  const token = params.token;

  // If user is logged in, try to accept invitation
  if (session?.user?.id) {
    const result = await acceptInvitation(token);
    if (result.success) {
      redirect('/my-bookings');
    }
  }

  return <InvitePageClient token={token} />;
}

