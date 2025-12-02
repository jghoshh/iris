import { NextRequest, NextResponse } from 'next/server'
import { ConversationMessage, SearchProfile } from '@/lib/conversation-agent'
import { getAIResponse, executeSearch } from '@/lib/ai-agent'
import { getOrCreateDemoUser } from '@/lib/demo-user'
import { GlobalPreferences, defaultGlobalPreferences } from '@/types'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log('[API] Request received')

  try {
    const body = await request.json()
    const { messages, searchProfile, triggerSearch } = body as {
      messages: ConversationMessage[]
      searchProfile: SearchProfile
      triggerSearch?: boolean
    }
    console.log(`[API] Body parsed: +${Date.now() - startTime}ms`)

    // Get user preferences
    const user = await getOrCreateDemoUser()
    const globalPreferences: GlobalPreferences = user.globalPreferences
      ? JSON.parse(user.globalPreferences)
      : defaultGlobalPreferences
    console.log(`[API] User prefs loaded: +${Date.now() - startTime}ms`)

    // If triggerSearch is true, execute the actual search
    if (triggerSearch) {
      console.log(`[API] Executing search...`)
      const response = await executeSearch(searchProfile, globalPreferences)
      console.log(`[API] Search complete: +${Date.now() - startTime}ms`)

      return NextResponse.json({
        success: true,
        data: response,
      })
    }

    // Get AI response with potential tool calls
    console.log(`[API] Calling AI...`)
    const response = await getAIResponse(messages, searchProfile, globalPreferences)
    console.log(`[API] AI response received: +${Date.now() - startTime}ms`)

    return NextResponse.json({
      success: true,
      data: response,
    })
  } catch (error) {
    console.error('Conversation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get response' },
      { status: 500 }
    )
  }
}
