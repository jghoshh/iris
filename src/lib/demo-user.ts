import { prisma } from './prisma'
import { defaultGlobalPreferences } from '@/types'

const DEMO_USER_ID = 'demo-user-id'
const DEMO_USER_EMAIL = 'demo@iris.local'

// Cache the demo user to avoid DB calls on every request
let cachedUser: Awaited<ReturnType<typeof prisma.user.findUnique>> = null

export async function getOrCreateDemoUser() {
  // Return cached user if available
  if (cachedUser) {
    return cachedUser
  }

  let user = await prisma.user.findUnique({
    where: { id: DEMO_USER_ID },
  })

  if (!user) {
    user = await prisma.user.create({
      data: {
        id: DEMO_USER_ID,
        email: DEMO_USER_EMAIL,
        passwordHash: 'demo',
        globalPreferences: JSON.stringify(defaultGlobalPreferences),
      },
    })
  }

  cachedUser = user
  return user
}

export function getDemoUserId() {
  return DEMO_USER_ID
}
