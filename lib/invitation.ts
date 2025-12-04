import crypto from 'crypto';

/**
 * Generate a unique invitation token for a booking
 */
export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate invitation link
 */
export function generateInviteLink(token: string, baseUrl: string = process.env.NEXTAUTH_URL || 'http://localhost:3000'): string {
  return `${baseUrl}/invite/${token}`;
}

