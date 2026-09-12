import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export function isAllowedUnifespEmail(email: string | null | undefined) {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf('@');
  return at > 0 && normalized.slice(at + 1) === 'unifesp.br';
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  session: { strategy: 'jwt' },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          hd: 'unifesp.br',
          prompt: 'select_account',
        },
      },
    }),
  ],
  pages: { signIn: '/login' },
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider !== 'google') return false;
      const googleProfile = profile as { email_verified?: boolean; email?: string } | undefined;
      const email = user.email || googleProfile?.email;
      return googleProfile?.email_verified === true && isAllowedUnifespEmail(email);
    },
  },
};
