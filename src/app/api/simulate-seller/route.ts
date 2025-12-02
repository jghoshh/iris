import { NextRequest, NextResponse } from 'next/server'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'

interface SellerSimulationRequest {
  deal: {
    title: string
    price: number
    condition: string
    sellerName: string
  }
  conversationHistory: Array<{
    role: 'buyer' | 'seller'
    content: string
  }>
  buyerMessage: string
}

export async function POST(request: NextRequest) {
  try {
    const body: SellerSimulationRequest = await request.json()
    const { deal, conversationHistory, buyerMessage } = body

    // If no API key, use fallback responses
    if (!OPENROUTER_API_KEY) {
      const fallbackResponse = getContextualFallback(buyerMessage, conversationHistory.length)
      return NextResponse.json({ response: fallbackResponse })
    }

    const systemPrompt = `You are simulating a seller on Facebook Marketplace responding to a buyer. You're selling: "${deal.title}" for $${deal.price} (condition: ${deal.condition}).

Your personality as ${deal.sellerName}:
- Casual and friendly, like texting
- Brief responses (1-2 sentences max)
- You want to sell but you're not desperate
- You're open to reasonable offers but won't accept lowballs
- You respond naturally like a real person

Rules:
- Keep responses under 20 words
- Be realistic - sometimes agree, sometimes counter-offer, sometimes decline
- If they offer 80-90% of asking price, you'll likely accept
- If they offer below 70%, politely decline or counter
- If they ask about availability, confirm it's available
- If they want to schedule pickup, suggest a time`

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(m => ({
        role: m.role === 'buyer' ? 'user' : 'assistant',
        content: m.content
      })),
      { role: 'user', content: buyerMessage }
    ]

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://iris-deals.app',
        'X-Title': 'Iris Seller Simulation',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 60,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenRouter error:', errorText)
      const fallbackResponse = getContextualFallback(buyerMessage, conversationHistory.length)
      return NextResponse.json({ response: fallbackResponse })
    }

    const data = await response.json()
    const sellerResponse = data.choices[0]?.message?.content || "Yes, it's still available!"

    return NextResponse.json({ response: sellerResponse })
  } catch (error) {
    console.error('Seller simulation error:', error)
    return NextResponse.json({ response: "Yes it's still available!" })
  }
}

function getContextualFallback(buyerMessage: string, messageCount: number): string {
  const lowerMessage = buyerMessage.toLowerCase()

  // First message - usually availability check
  if (messageCount === 0) {
    if (lowerMessage.includes('available')) {
      return "Yes it's still available!"
    }
    if (lowerMessage.includes('$') || lowerMessage.includes('offer')) {
      return "Yeah that works, when can you pick up?"
    }
    return "Hey! Yes still available, interested?"
  }

  // Check for price negotiation
  if (lowerMessage.includes('$') || lowerMessage.includes('offer') || lowerMessage.includes('take')) {
    const responses = [
      "Yeah I can do that, when can you pick up?",
      "Meet me in the middle and it's yours",
      "That works for me. Tomorrow good?",
    ]
    return responses[Math.floor(Math.random() * responses.length)]
  }

  // Check for scheduling
  if (lowerMessage.includes('pick up') || lowerMessage.includes('when') || lowerMessage.includes('today') || lowerMessage.includes('tomorrow')) {
    const responses = [
      "I'm free this afternoon or tomorrow morning",
      "How about 3pm today?",
      "Weekend works best for me",
    ]
    return responses[Math.floor(Math.random() * responses.length)]
  }

  // Check for condition questions
  if (lowerMessage.includes('condition') || lowerMessage.includes('scratch') || lowerMessage.includes('work')) {
    return "Works great, no issues. I can send more pics if you want"
  }

  // Check for address/location
  if (lowerMessage.includes('address') || lowerMessage.includes('where') || lowerMessage.includes('meet')) {
    return "I'll send you the address when you're ready to come"
  }

  // Generic positive responses
  const genericResponses = [
    "Sounds good!",
    "Works for me",
    "Cool, let me know",
    "Sure thing",
  ]
  return genericResponses[Math.floor(Math.random() * genericResponses.length)]
}
