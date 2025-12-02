import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateDemoUser } from '@/lib/demo-user'
import { defaultSoftPreferences, SessionSummary } from '@/types'

export async function GET() {
  try {
    const demoUser = await getOrCreateDemoUser()

    const sessions = await prisma.session.findMany({
      where: { userId: demoUser.id },
      include: {
        deals: {
          select: {
            id: true,
            state: true,
            dealScore: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    const summaries: SessionSummary[] = sessions.map((session) => {
      const activeDeals = session.deals.filter(
        (d) => !['done', 'dead'].includes(d.state)
      )
      const scores = session.deals.map((d) => d.dealScore).filter((s) => s > 0)
      const highestScore = scores.length > 0 ? Math.max(...scores) : null

      let statusSummary = 'No deals yet'
      if (activeDeals.length === 0 && session.deals.length > 0) {
        statusSummary = 'All deals closed'
      } else if (highestScore && highestScore >= 70) {
        statusSummary = `${activeDeals.length} deal${activeDeals.length > 1 ? 's' : ''}, strong candidate`
      } else if (activeDeals.length > 0) {
        statusSummary = `${activeDeals.length} active deal${activeDeals.length > 1 ? 's' : ''}`
      }

      return {
        id: session.id,
        name: session.name,
        status: session.status as 'active' | 'archived',
        activeDealsCount: activeDeals.length,
        highestDealScore: highestScore,
        statusSummary,
        createdAt: session.createdAt,
      }
    })

    return NextResponse.json({ success: true, data: summaries })
  } catch (error) {
    console.error('Get sessions error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const demoUser = await getOrCreateDemoUser()

    const body = await request.json()
    const {
      name,
      goalText,
      budgetMin,
      budgetMax,
      hardConstraints = {},
      softPreferences = defaultSoftPreferences,
      deadlineDate,
    } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Session name is required' },
        { status: 400 }
      )
    }

    const session = await prisma.session.create({
      data: {
        userId: demoUser.id,
        name,
        goalText,
        budgetMin,
        budgetMax,
        hardConstraints: JSON.stringify(hardConstraints),
        softPreferences: JSON.stringify(softPreferences),
        deadlineDate: deadlineDate ? new Date(deadlineDate) : null,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...session,
        hardConstraints: JSON.parse(session.hardConstraints),
        softPreferences: JSON.parse(session.softPreferences),
      },
    })
  } catch (error) {
    console.error('Create session error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
