import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await prisma.session.findFirst({
      where: { id },
      include: {
        deals: {
          include: {
            negotiationPlan: true,
            chatTurns: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          orderBy: { dealScore: 'desc' },
        },
      },
    })

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...session,
        hardConstraints: JSON.parse(session.hardConstraints),
        softPreferences: JSON.parse(session.softPreferences),
        deals: session.deals.map((deal) => ({
          ...deal,
          listingAttributes: JSON.parse(deal.listingAttributes),
          lastMessageAt: deal.chatTurns[0]?.createdAt || null,
        })),
      },
    })
  } catch (error) {
    console.error('Get session error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.session.findFirst({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.goalText !== undefined) updateData.goalText = body.goalText
    if (body.budgetMin !== undefined) updateData.budgetMin = body.budgetMin
    if (body.budgetMax !== undefined) updateData.budgetMax = body.budgetMax
    if (body.hardConstraints !== undefined)
      updateData.hardConstraints = JSON.stringify(body.hardConstraints)
    if (body.softPreferences !== undefined)
      updateData.softPreferences = JSON.stringify(body.softPreferences)
    if (body.deadlineDate !== undefined)
      updateData.deadlineDate = body.deadlineDate ? new Date(body.deadlineDate) : null
    if (body.status !== undefined) updateData.status = body.status
    if (body.winnerDealId !== undefined) updateData.winnerDealId = body.winnerDealId

    const session = await prisma.session.update({
      where: { id },
      data: updateData,
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
    console.error('Update session error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await prisma.session.findFirst({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      )
    }

    await prisma.session.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete session error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
