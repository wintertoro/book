import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

// Development mode: bypass authentication for local testing
const isDev = process.env.DEV_MODE === 'true';

// Mock auth function for development mode
const mockAuth = async () => {
  return {
    user: {
      id: 'dev-user-123',
      name: 'Dev User',
      email: 'dev@example.com',
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  };
};

const nextAuthConfig = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || 'dummy-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy-client-secret',
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  secret: process.env.AUTH_SECRET,
});

// Export handlers and auth functions
export const { handlers, signIn, signOut } = nextAuthConfig;

// Override auth function in dev mode
export const auth = isDev ? mockAuth : nextAuthConfig.auth;

