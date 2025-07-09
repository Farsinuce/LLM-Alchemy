import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface User {
    isGuest?: boolean
  }

  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      isGuest: boolean
      dailyLimit: {
        date: string
        count: number
        maxCount: number
      }
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    isGuest?: boolean
    dailyLimit?: {
      date: string
      count: number
      maxCount: number
    }
  }
}
