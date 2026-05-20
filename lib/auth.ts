import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const allowedEmails = process.env.TRACKER_ALLOWED_EMAILS
  ?.split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const isTrackerAllowlistConfigured = Boolean(allowedEmails?.length);

export function isTrackerEmailAllowed(email?: string | null) {
  return Boolean(email && allowedEmails?.includes(email.toLowerCase()));
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user }) {
      return isTrackerEmailAllowed(user.email);
    },
  },
};
