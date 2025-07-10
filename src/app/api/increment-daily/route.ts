import { getServerSession } from "next-auth/next"
import { NextRequest, NextResponse } from "next/server"
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { nanoid } from 'nanoid'

// We need to recreate the NextAuth config here to get the session
const authOptions = {
  providers: [
    CredentialsProvider({
      id: 'guest',
      name: 'Guest Session',
      credentials: {},
      async authorize() {
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
    strategy: 'jwt' as const,
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  callbacks: {
    async jwt({ token, user }: { token: any; user?: any }) {
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
    async session({ session, token }: { session: any; token: any }) {
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
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check if user has reached daily limit
    const currentCount = session.user.dailyLimit?.count || 0
    const maxCount = session.user.dailyLimit?.maxCount || 50
    
    if (currentCount >= maxCount) {
      return NextResponse.json({ 
        error: 'Daily limit reached',
        count: currentCount,
        maxCount: maxCount
      }, { status: 429 })
    }

    // For now, we'll return the incremented count
    // In a real implementation, we'd update the JWT token
    const newCount = currentCount + 1
    
    return NextResponse.json({ 
      success: true,
      count: newCount,
      maxCount: maxCount
    })
    
  } catch (error) {
    console.error('Error incrementing daily counter:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
