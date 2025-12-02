import { GlobalPreferences } from '@/types'
import { DealCardData, NegotiationMessage } from '@/components/DealComponents'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const SIMULATE_CALLS = !OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'your-openrouter-api-key-here'

// Interactive component types that can be embedded in messages
export type InteractiveComponent =
  | { type: 'text_input'; id: string; label: string; placeholder?: string }
  | { type: 'number_input'; id: string; label: string; placeholder?: string; min?: number; max?: number }
  | { type: 'select'; id: string; label: string; options: { value: string; label: string }[] }
  | { type: 'multi_select'; id: string; label: string; options: { value: string; label: string }[] }
  | { type: 'checkbox'; id: string; label: string }
  | { type: 'checkbox_group'; id: string; label: string; options: { value: string; label: string }[] }
  | { type: 'confirm'; id: string; confirmLabel?: string; cancelLabel?: string }
  | { type: 'budget_input'; id: string; item: string }
  | { type: 'edit_choice'; id: string; item?: string; budget?: number } // For choosing what to edit
  // Rich deal components
  | { type: 'deal_carousel'; id: string; deals: DealCardData[] }
  | { type: 'deal_card'; id: string; deal: DealCardData }
  | { type: 'deal_comparison'; id: string; deals: DealCardData[] }
  | { type: 'negotiation_suggestions'; id: string; suggestions: { id: string; label: string; message: string; style: 'friendly' | 'direct' | 'firm' }[] }
  | { type: 'negotiation_thread'; id: string; messages: NegotiationMessage[]; dealId: string }
  | { type: 'searching'; id: string; query: string }
  // Integrated negotiation interface - combines thread, suggestions, and input
  | { type: 'negotiation_interface'; id: string; deal: DealCardData; messages: NegotiationMessage[]; suggestions?: { id: string; label: string; message: string; style: 'friendly' | 'direct' | 'firm' }[]; waitingForSeller?: boolean }

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  components?: InteractiveComponent[]
  componentValues?: Record<string, unknown>
  timestamp: Date
  // For reasoning models - preserve across conversation turns
  reasoning_details?: unknown[]
}

export interface SearchProfile {
  itemDescription?: string | null  // null used to explicitly clear via JSON
  budgetMin?: number | null
  budgetMax?: number | null
  maxDistance?: number
  urgency?: 'no_rush' | 'this_week' | 'asap'
  mustHaves?: string[]
  niceToHaves?: string[]
  dealBreakers?: string[]
  preferredMarketplaces?: string[]
  isComplete: boolean
  // Deal state
  foundDeals?: DealCardData[]
  selectedDealId?: string
  negotiationMessages?: NegotiationMessage[]
}

export type ConversationStage =
  | 'greeting'
  | 'gathering_item'
  | 'gathering_budget'
  | 'gathering_preferences'
  | 'confirming'
  | 'searching'        // Iris is finding deals
  | 'showing_deals'    // Displaying found deals
  | 'deal_selected'    // User picked a deal
  | 'negotiating'      // In negotiation flow
  | 'ready'

export interface ConversationState {
  messages: ConversationMessage[]
  searchProfile: SearchProfile
  stage: ConversationStage
}

function buildConversationSystemPrompt(
  currentProfile: SearchProfile,
  globalPreferences: GlobalPreferences
): string {
  return `you're iris - a friend who's good at finding stuff on marketplace or whatever and helping negotiate prices.

talk like you're texting a friend. all lowercase. casual, warm, helpful. no formal language, no corporate speak.

## what you know so far
${JSON.stringify(currentProfile, null, 2)}

## their preferences
- negotiation style: ${globalPreferences.aggressiveness}
- max travel: ${globalPreferences.maxDistanceKm}km

## what you need to find out (in any order, as naturally as possible)
- what they're looking for (item)
- how much they want to spend (budget)
- any must-haves or dealbreakers (optional)
- how soon they need it (urgency - optional, default to "this_week")

## important: handling real user input
users rarely answer exactly what you ask. they might:
- give you everything at once ("looking for an iphone 13, budget $300-400, need it by friday")
- go off topic ("actually wait, do you also do furniture?")
- ask questions ("how does this work?")
- be vague ("just something cheap")
- change their mind ("actually make that $500")

extract whatever info you can from each message. acknowledge what they said. ask about what's still missing.

## ready to confirm when you have:
- item description (required)
- budget max (required, can infer from context)
- everything else is optional

## how to talk
- like texting a friend
- all lowercase
- acknowledge what they said before asking more
- one question at a time usually, unless it flows naturally
- be flexible, not rigid

## response format (JSON)
{
  "message": "your response in lowercase",
  "components": [], // optional - only when it genuinely helps
  "profile_updates": {}, // extract ALL info from their message
  "stage": "gathering_info|confirming|ready"
}

## profile_updates examples
- user says "iphone 13 pro, around 400 bucks, asap": {"itemDescription": "iphone 13 pro", "budgetMax": 400, "urgency": "asap"}
- user says "actually my budget is higher, like 500": {"budgetMax": 500}
- user says "needs to have good battery": {"mustHaves": ["good battery"]}

## components (use sparingly)
- confirm: {"type": "confirm", "id": "start_search", "confirmLabel": "Let's go", "cancelLabel": "Edit"}

only use confirm component when you have enough info to start. don't use other components unless really needed.`
}

// Smart extraction functions
function extractItem(text: string): string | null {
  const lower = text.toLowerCase()

  // Common item patterns
  const itemPatterns = [
    /(?:looking for|want|need|find(?:ing)?|searching for|buying|get(?:ting)?)\s+(?:a|an|some)?\s*(.+?)(?:\.|,|for|under|around|budget|spent|\$|$)/i,
    /^(?:a|an)?\s*(.+?)(?:\.|,|for|under|around|\$|$)/i,
  ]

  for (const pattern of itemPatterns) {
    const match = text.match(pattern)
    if (match && match[1] && match[1].trim().length > 2) {
      const item = match[1].trim()
      // Filter out non-items
      if (!item.match(/^(yes|no|yeah|nah|ok|okay|sure|hi|hey|hello|thanks|thank|please|help|how|what|when|where|why)$/i)) {
        return item
      }
    }
  }

  // If it's short and looks like an item name
  if (lower.length < 50 && !lower.includes('?') && !lower.match(/^(yes|no|yeah|nah|ok|okay|sure|hi|hey|hello|thanks)$/i)) {
    return text.trim()
  }

  return null
}

function extractBudget(text: string): { min?: number; max?: number } {
  const numbers: number[] = []

  // Match various budget patterns
  const patterns = [
    /\$\s*(\d+)/g,
    /(\d+)\s*(?:dollars|bucks)/gi,
    /budget[:\s]+(?:around|about|like)?\s*\$?\s*(\d+)/gi,
    /(?:around|about|like|max|under|up to)\s*\$?\s*(\d+)/gi,
    /(\d+)\s*(?:-|to)\s*\$?\s*(\d+)/g,
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) numbers.push(parseInt(match[1]))
      if (match[2]) numbers.push(parseInt(match[2]))
    }
  }

  // Filter to reasonable budget amounts
  const validNumbers = numbers.filter(n => n >= 10 && n <= 50000)

  if (validNumbers.length === 0) return {}
  if (validNumbers.length === 1) return { max: validNumbers[0] }

  return {
    min: Math.min(...validNumbers),
    max: Math.max(...validNumbers)
  }
}

function extractUrgency(text: string): SearchProfile['urgency'] | null {
  const lower = text.toLowerCase()

  if (lower.match(/asap|urgent|today|tonight|tomorrow|right away|immediately|rush/)) {
    return 'asap'
  }
  if (lower.match(/this week|few days|couple days|next few days|soon/)) {
    return 'this_week'
  }
  if (lower.match(/no rush|no hurry|whenever|take.*time|not urgent|flexible/)) {
    return 'no_rush'
  }

  return null
}

function extractMustHaves(text: string): string[] {
  const lower = text.toLowerCase()
  const mustHaves: string[] = []

  const patterns = [
    /(?:need|must have|has to have|gotta have|requires?|want)\s+(.+?)(?:\.|,|and|but|$)/gi,
    /(?:needs?|must)\s+(?:to be|to have)?\s*(.+?)(?:\.|,|and|but|$)/gi,
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(lower)) !== null) {
      if (match[1] && match[1].trim().length > 2) {
        mustHaves.push(match[1].trim())
      }
    }
  }

  return mustHaves
}

function extractDealBreakers(text: string): string[] {
  const lower = text.toLowerCase()
  const dealBreakers: string[] = []

  const patterns = [
    /(?:no|don't want|avoid|not|can't have|won't accept)\s+(.+?)(?:\.|,|and|but|$)/gi,
    /(?:pass on|skip|reject)\s+(?:anything with)?\s*(.+?)(?:\.|,|and|but|$)/gi,
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(lower)) !== null) {
      if (match[1] && match[1].trim().length > 2) {
        dealBreakers.push(match[1].trim())
      }
    }
  }

  return dealBreakers
}

function parseUserMessage(text: string, currentProfile: SearchProfile): Partial<SearchProfile> {
  const updates: Partial<SearchProfile> = {}

  // Try to extract item if we don't have one
  if (!currentProfile.itemDescription) {
    const item = extractItem(text)
    if (item) updates.itemDescription = item
  }

  // Always try to extract/update budget
  const budget = extractBudget(text)
  if (budget.max) updates.budgetMax = budget.max
  if (budget.min) updates.budgetMin = budget.min

  // Try to extract urgency
  const urgency = extractUrgency(text)
  if (urgency) updates.urgency = urgency

  // Extract must-haves and deal-breakers
  const mustHaves = extractMustHaves(text)
  if (mustHaves.length > 0) {
    updates.mustHaves = [...(currentProfile.mustHaves || []), ...mustHaves]
  }

  const dealBreakers = extractDealBreakers(text)
  if (dealBreakers.length > 0) {
    updates.dealBreakers = [...(currentProfile.dealBreakers || []), ...dealBreakers]
  }

  return updates
}

function hasEnoughInfo(profile: SearchProfile): boolean {
  return !!(profile.itemDescription && profile.budgetMax)
}

function getMissingInfo(profile: SearchProfile): string[] {
  const missing: string[] = []
  if (!profile.itemDescription) missing.push('item')
  if (!profile.budgetMax) missing.push('budget')
  return missing
}

// Import marketplace datastore for searching
import { marketplaceDatastore, MarketplaceListing } from '@/lib/marketplace-datastore'
import { calculateAllScores } from '@/lib/scoring'

// Convert marketplace listing to deal card data with scores
function listingToDealCard(
  listing: MarketplaceListing,
  searchProfile: SearchProfile,
  globalPreferences: GlobalPreferences
): DealCardData {
  const scores = calculateAllScores(
    {}, // hardConstraints - could be derived from mustHaves
    {
      preferredBrands: [],
      preferredColors: [],
      preferredModels: [],
      importance: { price: 0.5, condition: 0.3, distance: 0.2, urgency: 0.0 }
    },
    listing.attributes as Record<string, string | number | boolean>,
    listing.description,
    listing.price,
    searchProfile.budgetMin || null,
    searchProfile.budgetMax || null,
    searchProfile.budgetMax ? searchProfile.budgetMax * 0.85 : null, // target price
    listing.distanceKm,
    globalPreferences.maxDistanceKm || 50,
    globalPreferences.avoidCashOnly || false,
    globalPreferences.avoidOffPlatform || false,
    listing.postedDaysAgo,
    0 // alternativeDealsCount
  )

  return {
    id: listing.id,
    title: listing.title,
    price: listing.price,
    description: listing.description,
    imageUrl: listing.imageUrl,
    marketplace: listing.marketplace,
    location: listing.location,
    distanceKm: listing.distanceKm,
    postedDaysAgo: listing.postedDaysAgo,
    sellerName: listing.sellerName,
    sellerRating: listing.sellerRating,
    condition: listing.condition,
    dealScore: scores.dealScore,
    priceScore: scores.priceScore,
    riskScore: scores.riskScore,
    attributes: listing.attributes,
  }
}

// Generate negotiation message suggestions based on deal and preferences
function generateNegotiationSuggestions(
  deal: DealCardData,
  searchProfile: SearchProfile,
  globalPreferences: GlobalPreferences,
  existingMessages: NegotiationMessage[]
): { id: string; label: string; message: string; style: 'friendly' | 'direct' | 'firm' }[] {
  const targetPrice = searchProfile.budgetMax
    ? Math.round(searchProfile.budgetMax * 0.8)
    : Math.round(deal.price * 0.8)

  const isFirstMessage = existingMessages.length === 0
  const tone = globalPreferences.tone || 'casual_friendly'
  const aggressiveness = globalPreferences.aggressiveness || 'balanced'

  if (isFirstMessage) {
    // Opening messages
    const suggestions = []

    if (aggressiveness === 'conservative' || tone === 'polite_formal') {
      suggestions.push({
        id: 'friendly-open',
        label: 'Warm opener',
        message: `Hi! I'm interested in your ${deal.title.toLowerCase()}. Is it still available? I'd love to learn more about its condition.`,
        style: 'friendly' as const
      })
    }

    suggestions.push({
      id: 'direct-open',
      label: 'Get to the point',
      message: `Hey, is this still available? Would you take $${targetPrice}?`,
      style: 'direct' as const
    })

    if (deal.postedDaysAgo > 7 || aggressiveness === 'aggressive') {
      suggestions.push({
        id: 'firm-open',
        label: 'Leverage listing age',
        message: `Hi, I noticed this has been listed for a while. I can pick up today for $${targetPrice} cash. Let me know.`,
        style: 'firm' as const
      })
    }

    return suggestions
  }

  // Follow-up messages after seller response
  const lastSellerMsg = existingMessages.filter(m => m.role === 'seller').pop()

  if (lastSellerMsg) {
    const sellerText = lastSellerMsg.content.toLowerCase()

    // If seller countered or said no
    if (sellerText.includes('firm') || sellerText.includes('no') || sellerText.includes('lowest')) {
      return [
        {
          id: 'friendly-counter',
          label: 'Stay friendly',
          message: `I understand, thanks for letting me know. Would you consider $${Math.round(deal.price * 0.9)} if I can pick up today?`,
          style: 'friendly'
        },
        {
          id: 'walk-signal',
          label: 'Signal walking away',
          message: `Ah that's a bit above my budget. I'll keep looking but let me know if anything changes!`,
          style: 'direct'
        }
      ]
    }

    // If seller seems interested
    return [
      {
        id: 'close-deal',
        label: 'Close the deal',
        message: `Great! When works for you to meet up? I'm flexible this week.`,
        style: 'friendly'
      },
      {
        id: 'verify-condition',
        label: 'Verify before meeting',
        message: `Sounds good. Can you send a few more photos? Just want to make sure everything looks right before I head over.`,
        style: 'direct'
      }
    ]
  }

  return []
}

function simulateConversationResponse(
  messages: ConversationMessage[],
  currentProfile: SearchProfile,
  globalPreferences: GlobalPreferences
): { message: string; components?: InteractiveComponent[]; profile_updates: Partial<SearchProfile>; stage: ConversationStage } {
  const lastUserMessage = messages.filter(m => m.role === 'user').pop()
  const messageCount = messages.filter(m => m.role === 'user').length

  // Initial greeting
  if (messageCount === 0) {
    return {
      message: "hey! i'm iris. i help people find stuff on marketplace and negotiate the best price. what are you looking for?",
      stage: 'greeting',
      profile_updates: {}
    }
  }

  if (!lastUserMessage) {
    return {
      message: "hey, what are you looking for?",
      stage: 'gathering_item',
      profile_updates: {}
    }
  }

  const userText = lastUserMessage.content.toLowerCase()
  const componentValues = lastUserMessage.componentValues || {}

  // Handle deal selection from carousel
  if (componentValues.selected_deal_id) {
    const selectedDeal = currentProfile.foundDeals?.find(
      d => d.id === componentValues.selected_deal_id
    )
    if (selectedDeal) {
      const suggestions = generateNegotiationSuggestions(
        selectedDeal,
        currentProfile,
        globalPreferences,
        []
      )

      return {
        message: `nice pick! ${selectedDeal.title.toLowerCase()} for $${selectedDeal.price}. deal score is ${selectedDeal.dealScore}/100 which is ${selectedDeal.dealScore >= 70 ? 'pretty solid' : selectedDeal.dealScore >= 50 ? 'decent' : 'a bit risky'}.\n\nhere's what i'd say to open:`,
        components: [
          {
            type: 'deal_card',
            id: 'selected_deal',
            deal: selectedDeal
          },
          {
            type: 'negotiation_suggestions',
            id: 'opening_messages',
            suggestions
          }
        ],
        profile_updates: {
          selectedDealId: selectedDeal.id,
          negotiationMessages: []
        },
        stage: 'deal_selected'
      }
    }
  }

  // Handle negotiation message selection
  if (componentValues.sent_message) {
    const currentMessages = currentProfile.negotiationMessages || []
    const newMessage: NegotiationMessage = {
      id: `buyer-${Date.now()}`,
      role: 'buyer',
      content: componentValues.sent_message as string,
      timestamp: new Date()
    }

    return {
      message: "sent! now paste what the seller says back and i'll help you with the next move",
      components: [
        {
          type: 'negotiation_thread',
          id: 'thread',
          messages: [...currentMessages, newMessage],
          dealId: currentProfile.selectedDealId || ''
        }
      ],
      profile_updates: {
        negotiationMessages: [...currentMessages, newMessage]
      },
      stage: 'negotiating'
    }
  }

  // Handle seller response paste
  if (componentValues.seller_response) {
    const currentMessages = currentProfile.negotiationMessages || []
    const sellerMessage: NegotiationMessage = {
      id: `seller-${Date.now()}`,
      role: 'seller',
      content: componentValues.seller_response as string,
      timestamp: new Date()
    }
    const updatedMessages = [...currentMessages, sellerMessage]

    const selectedDeal = currentProfile.foundDeals?.find(
      d => d.id === currentProfile.selectedDealId
    )

    if (selectedDeal) {
      const suggestions = generateNegotiationSuggestions(
        selectedDeal,
        currentProfile,
        globalPreferences,
        updatedMessages
      )

      return {
        message: "got it. here's what i'd say next:",
        components: [
          {
            type: 'negotiation_thread',
            id: 'thread',
            messages: updatedMessages,
            dealId: currentProfile.selectedDealId || ''
          },
          {
            type: 'negotiation_suggestions',
            id: 'next_messages',
            suggestions
          }
        ],
        profile_updates: {
          negotiationMessages: updatedMessages
        },
        stage: 'negotiating'
      }
    }
  }

  // Handle confirmation to start search
  if (componentValues.start_search === true) {
    return {
      message: `on it! searching for ${currentProfile.itemDescription?.toLowerCase()}...`,
      components: [
        {
          type: 'searching',
          id: 'search_animation',
          query: currentProfile.itemDescription || ''
        }
      ],
      profile_updates: { isComplete: true },
      stage: 'searching'
    }
  }

  if (componentValues.start_search === false) {
    return {
      message: "no worries, what do you want to change?",
      profile_updates: {},
      stage: 'gathering_preferences'
    }
  }

  // Parse everything we can from the message
  const updates = parseUserMessage(lastUserMessage.content, currentProfile)
  const newProfile = { ...currentProfile, ...updates }

  // Handle questions and off-topic
  if (userText.includes('?')) {
    if (userText.match(/how.*work|what.*do|help/)) {
      return {
        message: "basically you tell me what you're looking for, i go find the best deals, score them, and help you negotiate. so what are you trying to find?",
        profile_updates: updates,
        stage: 'gathering_item'
      }
    }
    if (userText.match(/furniture|car|other/)) {
      return {
        message: "yeah i can help with pretty much anything on marketplace. what do you need?",
        profile_updates: updates,
        stage: 'gathering_item'
      }
    }
  }

  // Handle greetings
  if (userText.match(/^(hi|hey|hello|yo|sup)$/i)) {
    return {
      message: "hey! what are you looking for?",
      profile_updates: {},
      stage: 'gathering_item'
    }
  }

  // Handle vague responses
  if (userText.match(/^(idk|i don't know|not sure|something|anything)$/i)) {
    return {
      message: "no worries, just tell me roughly what kind of thing you're looking for and we can figure it out",
      profile_updates: {},
      stage: 'gathering_item'
    }
  }

  // If we have enough info, confirm
  if (hasEnoughInfo(newProfile)) {
    const urgencyText = newProfile.urgency === 'asap' ? 'asap'
      : newProfile.urgency === 'no_rush' ? 'whenever'
      : 'this week'

    let summary = `ok so: ${newProfile.itemDescription?.toLowerCase()}, around $${newProfile.budgetMax}`

    if (newProfile.urgency) {
      summary += `, ${urgencyText}`
    }
    if (newProfile.mustHaves && newProfile.mustHaves.length > 0 && newProfile.mustHaves[0]) {
      summary += `, needs ${newProfile.mustHaves.join(', ').toLowerCase()}`
    }
    if (newProfile.dealBreakers && newProfile.dealBreakers.length > 0 && newProfile.dealBreakers[0]) {
      summary += `, no ${newProfile.dealBreakers.join(', ').toLowerCase()}`
    }

    summary += `. want me to go find some deals?`

    return {
      message: summary,
      components: [
        {
          type: 'confirm',
          id: 'start_search',
          confirmLabel: "Let's go",
          cancelLabel: 'Edit'
        }
      ],
      profile_updates: updates,
      stage: 'confirming'
    }
  }

  // Ask for missing info naturally
  const missing = getMissingInfo(newProfile)

  if (missing.includes('item')) {
    // We didn't understand what they want
    if (Object.keys(updates).length > 0) {
      return {
        message: "got it, but what exactly are you looking for?",
        profile_updates: updates,
        stage: 'gathering_item'
      }
    }
    return {
      message: "what are you trying to find?",
      profile_updates: updates,
      stage: 'gathering_item'
    }
  }

  if (missing.includes('budget')) {
    const item = newProfile.itemDescription?.toLowerCase()
    return {
      message: `nice, ${item}. how much are you trying to spend?`,
      profile_updates: updates,
      stage: 'gathering_budget'
    }
  }

  // Fallback - acknowledge and ask for more
  return {
    message: "got it. anything else i should know, or ready for me to start looking?",
    components: [
      {
        type: 'confirm',
        id: 'start_search',
        confirmLabel: "Let's go",
        cancelLabel: 'Add more'
      }
    ],
    profile_updates: updates,
    stage: 'confirming'
  }
}

// Async function to actually search and return deals
export async function searchForDeals(
  searchProfile: SearchProfile,
  globalPreferences: GlobalPreferences
): Promise<DealCardData[]> {
  const listings = await marketplaceDatastore.search({
    query: searchProfile.itemDescription || '',
    budgetMin: searchProfile.budgetMin ?? undefined,
    budgetMax: searchProfile.budgetMax ?? undefined,
    maxDistanceKm: searchProfile.maxDistance || globalPreferences.maxDistanceKm,
    mustHaves: searchProfile.mustHaves,
    dealBreakers: searchProfile.dealBreakers,
  })

  return listings.map(listing =>
    listingToDealCard(listing, searchProfile, globalPreferences)
  ).sort((a, b) => b.dealScore - a.dealScore) // Sort by deal score descending
}

async function callOpenRouterConversation(
  messages: ConversationMessage[],
  currentProfile: SearchProfile,
  globalPreferences: GlobalPreferences
): Promise<{ message: string; components?: InteractiveComponent[]; profile_updates: Partial<SearchProfile>; stage: ConversationState['stage'] }> {
  const systemPrompt = buildConversationSystemPrompt(currentProfile, globalPreferences)

  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.role === 'user'
        ? (m.componentValues ? `${m.content}\n[User selections: ${JSON.stringify(m.componentValues)}]` : m.content)
        : m.content
    }))
  ]

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://iris-app.local',
      'X-Title': 'Iris',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3-haiku',
      messages: chatMessages,
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 800,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.statusText}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content

  if (!content) {
    throw new Error('No response from OpenRouter')
  }

  return JSON.parse(content)
}

export async function getConversationResponse(
  messages: ConversationMessage[],
  currentProfile: SearchProfile,
  globalPreferences: GlobalPreferences
): Promise<{ message: string; components?: InteractiveComponent[]; profile_updates: Partial<SearchProfile>; stage: ConversationState['stage'] }> {
  if (SIMULATE_CALLS) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return simulateConversationResponse(messages, currentProfile, globalPreferences)
  }

  return callOpenRouterConversation(messages, currentProfile, globalPreferences)
}

export function createInitialConversationState(): ConversationState {
  return {
    messages: [],
    searchProfile: { isComplete: false },
    stage: 'greeting'
  }
}
