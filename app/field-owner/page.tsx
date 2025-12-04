import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import FieldOwnerDashboardClient from '@/components/FieldOwnerDashboardClient';

export default async function FieldOwnerPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/login');
  }

  if (!prisma) {
    throw new Error('Prisma client is not initialized. Please restart the dev server.');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user || (user.role !== 'FIELD_OWNER' && user.role !== 'ADMIN')) {
    redirect('/');
  }

  return <FieldOwnerDashboardClient />;
}

