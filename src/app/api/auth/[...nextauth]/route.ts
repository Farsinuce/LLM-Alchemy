import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { nanoid } from 'nanoid'

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      id: 'guest',
      name: 'Guest Session',
      credentials: {},
      async authorize() {
        // Create a guest user
        const guestId = `guest_${nanoid(10)}`
        return {
          id: guestId,
          name: 'Guest Player',
          email: null,
          isGuest: true,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user && 'isGuest' in user) {
        token.isGuest = user.isGuest
        token.dailyLimit = {
          date: new Date().toDateString(),
          count: 0,
          maxCount: 50
        }
      }
      
      // Reset daily count if it's a new day
      const today = new Date().toDateString()
      if (token.dailyLimit && token.dailyLimit.date !== today) {
        token.dailyLimit = {
          date: today,
          count: 0,
          maxCount: 50
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string
        session.user.isGuest = (token.isGuest as boolean) || false
        session.user.dailyLimit = token.dailyLimit || {
          date: new Date().toDateString(),
          count: 0,
          maxCount: 50
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
})

export { handler as GET, handler as POST }
