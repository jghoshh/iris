/**
 * AI Agent Module
 *
 * Handles communication with OpenRouter API using function calling
 * to dynamically spawn UI components based on conversation context.
 */

import { GlobalPreferences } from '@/types'
import { DealCardData, NegotiationMessage } from '@/components/DealComponents'
import { InteractiveComponent, SearchProfile, ConversationMessage, ConversationStage } from './conversation-agent'
import { AI_TOOLS, parseToolCall } from './ai-tools'
import { marketplaceDatastore } from './marketplace-datastore'
import { calculateAllScores } from './scoring'

// Environment configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL 
const SIMULATE_CALLS = !OPENROUTER_API_KEY

/**
 * Build system prompt for the AI agent
 */
function buildSystemPrompt(
  currentProfile: SearchProfile,
  _globalPreferences: GlobalPreferences
): string {
  // System prompt is padded to 1024+ tokens to enable OpenAI prompt caching
  // Cached prompts reduce latency and cost on subsequent requests
  return `You're Iris - a casual, friendly marketplace deal finder and negotiation coach. Your personality is helpful, chill, and encouraging. You speak in lowercase, keep messages brief (under 15 words), and sound like a knowledgeable friend who's great at finding deals.

## Your Purpose
You help people find items on Facebook Marketplace, Craigslist, and other secondhand marketplaces. You guide them through:
1. Understanding what they're looking for
2. Setting a realistic budget
3. Searching for matching deals
4. Selecting the best options
5. Negotiating with sellers to get the best price

## Current Conversation State
${JSON.stringify({
  itemDescription: currentProfile.itemDescription,
  budgetMax: currentProfile.budgetMax,
  budgetMin: currentProfile.budgetMin,
  selectedDealId: currentProfile.selectedDealId,
  hasFoundDeals: !!currentProfile.foundDeals?.length,
  dealCount: currentProfile.foundDeals?.length || 0,
})}

## Available Tools (use via tool_calls)
- ask_for_budget: When you know what item they want but need their budget. Shows a budget input field with an "I don't know" option.
- ask_for_confirmation: When you have both item and budget, confirm before searching. Shows confirm/edit buttons.
- search_marketplace: When confirmed and ready to search. Shows searching animation, then results.
- show_deal_details: Display expanded info about a specific deal when user wants to know more.
- start_negotiation: When user has picked a deal they want to pursue. Shows the deal card and opening message suggestions.
- generate_message_suggestions: Generate next message options based on negotiation context (opening, counter_offer, closing, walking_away).
- show_negotiation_thread: Display the conversation thread with the seller.
- compare_deals: Show side-by-side comparison when user is deciding between multiple options.

## Conversation Flow
1. GREETING: User arrives, you introduce yourself
2. GATHERING_ITEM: Get what they're looking for
3. GATHERING_BUDGET: Get their max budget (or let them skip if unknown)
4. CONFIRMING: Summarize and confirm before searching
5. SEARCHING: Execute the search, show animation
6. SHOWING_DEALS: Display results in a carousel
7. DEAL_SELECTED: User picked one, show negotiation options
8. NEGOTIATING: Help them craft messages to the seller

## Tool Usage Guidelines
Use tools to show UI components. You MUST call the appropriate tool when the situation matches - don't just describe the action, actually call the tool.

CRITICAL - Call these tools when:
- ask_for_budget: User mentions an item they want. MUST call this tool.
- ask_for_confirmation: User provides budget (or says they don't know). MUST call this tool.
- search_marketplace: User confirms search (start_search:true). MUST call this tool.
- start_negotiation: User selects a deal (selected_deal_id in action). IMMEDIATELY call this tool - don't ask if they want to negotiate, just start!

## Response Style
- Always lowercase (except proper nouns)
- Brief and casual - like texting a friend
- Encouraging but not over-the-top
- Focus on helping them get a good deal
- Never use emojis unless user does first
- Keep responses under 15 words when possible

## Negotiation Expertise
You understand marketplace negotiation tactics:
- Opening low but reasonable (typically 70-80% of asking price)
- Using urgency ("can pick up today", "cash ready")
- Building rapport before making offers
- Knowing when to walk away
- Recognizing good deals vs overpriced items
- Reading seller motivation from listing details

## Example Interactions
User: "hey"
You: "hey! what are you looking for today?"

User: "looking for an iphone"
You: "nice! what's your max budget?" + call ask_for_budget(item="iphone")

User: "iphone 13 under 400"
You: "got it - iphone 13 under $400. ready to search?" + call ask_for_confirmation(summary="iphone 13 under $400")

User: [action: budget_amount=300]
You: "cool, $300 max. ready to find some deals?" + call ask_for_confirmation(summary="iphone for under $300")

User: [action: budget_unknown=true]
You: "no worries! i'll show you a range. ready to search?" + call ask_for_confirmation(summary="iphone (showing all prices)")
Note: When budget is unknown, use a sensible default like 9999 for budget_max when searching.

User: [action: start_search=true]
You: "on it!" + call search_marketplace(query="iphone", budget_max=300)

User: [action: selected_deal_id="deal-123"]
You: "nice pick! let's get you a deal" + call start_negotiation(deal_id="deal-123")

User: [action: start_search=false]
You: "no problem! what do you want to change?" (no tool call needed - let them type)

## DEMO MODE - Available Products
This is a demo with limited product categories. You can ONLY search for these items:
- iphone (also matches: phone, smartphone, apple phone, mobile)
- macbook (also matches: laptop, mac, apple laptop, notebook, computer)
- ps5 (also matches: playstation, gaming console, game console, sony)
- airpods (also matches: earbuds, headphones, wireless earbuds)
- monitor (also matches: display, screen, computer screen)
- desk (also matches: standing desk, work desk, office desk)
- chair (also matches: office chair, gaming chair, desk chair)
- bike (also matches: bicycle, road bike, mountain bike)
- couch (also matches: sofa, sectional, loveseat)

IMPORTANT: If user asks for something NOT in this list:
1. Check if it's similar to any available category (e.g., "laptop" → macbook, "headphones" → airpods)
2. If similar, suggest the matching category: "i don't have laptops but i can search for macbooks - want me to look?"
3. If NOT similar to anything, politely explain: "this demo only has: iphones, macbooks, ps5, airpods, monitors, desks, chairs, bikes, and couches. which would you like?"
4. Do NOT proceed to ask_for_budget for unavailable items

## Edge Cases to Handle
1. User provides item AND budget in one message (e.g., "iphone under 400"):
   - Extract both pieces of info
   - Call ask_for_confirmation immediately (skip ask_for_budget)

2. User changes mind after confirming:
   - If they say "wait" or "change" or "edit", just ask what they want to change
   - Don't call any tools, let them type freely

3. User asks about a deal without selecting:
   - If they ask questions like "tell me more about the first one", call show_deal_details
   - Don't start negotiation until they explicitly select

4. User wants to see different results:
   - If they say "show me more" or "different options", acknowledge and ask what to change
   - They may want different price range, different item, etc.

5. User provides budget range (e.g., "$200-400"):
   - Use the higher number as budget_max
   - Use the lower number as budget_min

Remember: When user selects a deal, IMMEDIATELY call start_negotiation - don't ask for confirmation.`
}

/**
 * Convert marketplace listing to deal card with scores
 */
function listingToDealCard(
  listing: Awaited<ReturnType<typeof marketplaceDatastore.search>>[0],
  searchProfile: SearchProfile,
  globalPreferences: GlobalPreferences
): DealCardData {
  const scores = calculateAllScores(
    {},
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
    searchProfile.budgetMax ? searchProfile.budgetMax * 0.85 : null,
    listing.distanceKm,
    globalPreferences.maxDistanceKm || 50,
    globalPreferences.avoidCashOnly || false,
    globalPreferences.avoidOffPlatform || false,
    listing.postedDaysAgo,
    0
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

/**
 * Execute a tool call and return the resulting component(s)
 */
async function executeToolCall(
  toolCall: { name: string; arguments: Record<string, unknown> },
  searchProfile: SearchProfile,
  _globalPreferences: GlobalPreferences,
  userAction?: Record<string, unknown>
): Promise<{ components: InteractiveComponent[]; profileUpdates: Partial<SearchProfile>; nextStage?: ConversationStage; overrideMessage?: string }> {
  const components: InteractiveComponent[] = []
  const profileUpdates: Partial<SearchProfile> = {}
  let nextStage: ConversationStage | undefined

  switch (toolCall.name) {
    case 'search_marketplace': {
      const args = toolCall.arguments as { query: string; budget_max: number; budget_min?: number; urgency?: string }

      // Only show searching animation - actual search happens via triggerSearch in frontend
      // This creates the proper two-step flow: animation first, then results
      components.push({
        type: 'searching',
        id: 'search_animation',
        query: args.query
      })

      // Store search params in profile for the subsequent executeSearch call
      profileUpdates.itemDescription = args.query
      profileUpdates.budgetMax = args.budget_max
      if (args.budget_min) profileUpdates.budgetMin = args.budget_min
      profileUpdates.isComplete = true
      nextStage = 'searching'

      break
    }

    case 'ask_for_confirmation': {
      const args = toolCall.arguments as { summary: string; confirm_label?: string; cancel_label?: string }
      components.push({
        type: 'confirm',
        id: 'start_search',
        confirmLabel: args.confirm_label || "Let's go",
        cancelLabel: args.cancel_label || 'Edit'
      })
      nextStage = 'confirming'
      break
    }

    case 'ask_for_budget': {
      const args = toolCall.arguments as { item: string }
      const itemLower = args.item.toLowerCase()

      // Demo product validation with synonyms
      const demoCategories: Record<string, string[]> = {
        iphone: ['iphone', 'phone', 'smartphone', 'apple phone', 'mobile'],
        macbook: ['macbook', 'laptop', 'mac', 'apple laptop', 'notebook', 'computer'],
        ps5: ['ps5', 'playstation', 'gaming console', 'game console', 'sony'],
        airpods: ['airpods', 'earbuds', 'headphones', 'wireless earbuds', 'earphones'],
        monitor: ['monitor', 'display', 'screen'],
        desk: ['desk', 'standing desk', 'work desk', 'office desk'],
        chair: ['chair', 'office chair', 'gaming chair', 'desk chair'],
        bike: ['bike', 'bicycle', 'road bike', 'mountain bike', 'cycling'],
        couch: ['couch', 'sofa', 'sectional', 'loveseat'],
      }

      // Check if the item matches any demo category
      let matchedCategory: string | null = null
      for (const [category, synonyms] of Object.entries(demoCategories)) {
        if (synonyms.some(syn => itemLower.includes(syn))) {
          matchedCategory = category
          break
        }
      }

      if (!matchedCategory) {
        // Item not in demo - return a message instead of the budget component
        return {
          components: [],
          profileUpdates: {},
          nextStage: 'gathering_item' as ConversationStage,
          overrideMessage: "this demo only has: iphones, macbooks, ps5, airpods, monitors, desks, chairs, bikes, and couches. which would you like to try?"
        }
      }

      components.push({
        type: 'budget_input',
        id: 'budget',
        item: args.item
      })
      profileUpdates.itemDescription = args.item
      nextStage = 'gathering_budget'
      break
    }

    case 'show_deal_details': {
      const args = toolCall.arguments as { deal_id: string }
      const deal = searchProfile.foundDeals?.find(d => d.id === args.deal_id)
      if (deal) {
        components.push({
          type: 'deal_card',
          id: 'deal_detail',
          deal
        })
      }
      break
    }

    case 'start_negotiation': {
      const args = toolCall.arguments as { deal_id: string }
      // Get deal_id from either tool args or user action (selected_deal_id)
      const dealId = args.deal_id || (userAction?.selected_deal_id as string)
      const deal = searchProfile.foundDeals?.find(d => d.id === dealId)
      if (deal) {
        // Generate opening suggestions - always base on the deal's asking price
        // Offer 75-80% of asking price as a reasonable opening offer
        const targetPrice = Math.round(deal.price * 0.8)

        const suggestions = [
          {
            id: 'friendly-open',
            label: 'Warm opener',
            message: `Hey! Is this still available?`,
            style: 'friendly' as const
          },
          {
            id: 'direct-open',
            label: 'Get to the point',
            message: `Hi, is this available? Would you do $${targetPrice}?`,
            style: 'direct' as const
          },
          {
            id: 'firm-open',
            label: 'Strong offer',
            message: `I can pick up today for $${targetPrice} cash if it's still available`,
            style: 'firm' as const
          }
        ]

        // Use integrated negotiation interface
        components.push({
          type: 'negotiation_interface',
          id: 'negotiation',
          deal,
          messages: [],
          suggestions,
          waitingForSeller: false
        })

        profileUpdates.selectedDealId = dealId
        profileUpdates.negotiationMessages = []
        nextStage = 'deal_selected'
      }
      break
    }

    case 'generate_message_suggestions': {
      const args = toolCall.arguments as { deal_id: string; context: string }
      const dealId = args.deal_id || searchProfile.selectedDealId
      const deal = searchProfile.foundDeals?.find(d => d.id === dealId)

      // If there's a seller response, add it to the thread first
      const sellerResponse = userAction?.seller_response as string
      let currentMessages = searchProfile.negotiationMessages || []

      if (sellerResponse) {
        const sellerMessage: NegotiationMessage = {
          id: `seller-${Date.now()}`,
          role: 'seller',
          content: sellerResponse,
          timestamp: new Date()
        }
        currentMessages = [...currentMessages, sellerMessage]
        profileUpdates.negotiationMessages = currentMessages
      }

      if (deal) {
        let suggestions: { id: string; label: string; message: string; style: 'friendly' | 'direct' | 'firm' }[] = []
        // Always base negotiation on the deal's asking price
        const targetPrice = Math.round(deal.price * 0.8)

        if (args.context === 'opening') {
          suggestions = [
            {
              id: 'friendly-open',
              label: 'Warm opener',
              message: `Hey! Is this still available?`,
              style: 'friendly'
            },
            {
              id: 'direct-open',
              label: 'Get to the point',
              message: `Hi, is this available? Would you do $${targetPrice}?`,
              style: 'direct'
            },
            {
              id: 'firm-open',
              label: 'Strong offer',
              message: `I can pick up today for $${targetPrice} cash if it's still available`,
              style: 'firm'
            }
          ]
        } else if (args.context === 'counter_offer') {
          suggestions = [
            {
              id: 'friendly-counter',
              label: 'Stay friendly',
              message: `Totally get it. Would $${Math.round(deal.price * 0.9)} work if I pick up today?`,
              style: 'friendly'
            },
            {
              id: 'walk-signal',
              label: 'Signal walking away',
              message: `Ah that's a bit more than I was hoping to spend. Let me know if you change your mind!`,
              style: 'direct'
            }
          ]
        } else if (args.context === 'closing') {
          suggestions = [
            {
              id: 'close-deal',
              label: 'Close the deal',
              message: `Great! When works for you to meet up? I'm flexible.`,
              style: 'friendly'
            },
            {
              id: 'verify-first',
              label: 'Verify condition',
              message: `Sounds good. Can you send a few more photos first?`,
              style: 'direct'
            }
          ]
        } else if (args.context === 'walking_away') {
          suggestions = [
            {
              id: 'polite-exit',
              label: 'Polite exit',
              message: `Thanks for your time, but I'll pass. Good luck with the sale!`,
              style: 'friendly'
            },
            {
              id: 'leave-door-open',
              label: 'Leave door open',
              message: `That's more than I can do right now. If you change your mind, feel free to reach out!`,
              style: 'direct'
            }
          ]
        }

        // Use integrated negotiation interface with suggestions
        components.push({
          type: 'negotiation_interface',
          id: 'negotiation',
          deal,
          messages: currentMessages,
          suggestions,
          waitingForSeller: false
        })
      }
      nextStage = 'negotiating'
      break
    }

    case 'show_negotiation_thread': {
      const args = toolCall.arguments as { deal_id: string; new_message?: string }
      const dealId = args.deal_id || searchProfile.selectedDealId
      const deal = searchProfile.foundDeals?.find(d => d.id === dealId)
      const currentMessages = searchProfile.negotiationMessages || []

      // Get the sent message from either tool args or user action
      const sentMessage = args.new_message || (userAction?.sent_message as string)

      // If there's a new message from the buyer, add it to the thread
      let updatedMessages = currentMessages
      if (sentMessage) {
        const newMessage: NegotiationMessage = {
          id: `buyer-${Date.now()}`,
          role: 'buyer',
          content: sentMessage,
          timestamp: new Date()
        }
        updatedMessages = [...currentMessages, newMessage]
        profileUpdates.negotiationMessages = updatedMessages
      }

      // Use integrated interface - waiting for seller response after sending
      if (deal) {
        components.push({
          type: 'negotiation_interface',
          id: 'negotiation',
          deal,
          messages: updatedMessages,
          suggestions: undefined,
          waitingForSeller: true
        })
      }
      nextStage = 'negotiating'
      break
    }

    case 'compare_deals': {
      const args = toolCall.arguments as { deal_ids: string[] }
      const deals = searchProfile.foundDeals?.filter(d => args.deal_ids.includes(d.id)) || []

      if (deals.length > 1) {
        components.push({
          type: 'deal_comparison',
          id: 'comparison',
          deals
        })
      }
      break
    }
  }

  return { components, profileUpdates, nextStage }
}

/**
 * Call OpenRouter API with function calling
 */
async function callOpenRouter(
  messages: ConversationMessage[],
  currentProfile: SearchProfile,
  globalPreferences: GlobalPreferences
): Promise<{
  message: string
  components: InteractiveComponent[]
  profile_updates: Partial<SearchProfile>
  stage: ConversationStage
  reasoning_details?: unknown[]
}> {
  const startTime = Date.now()
  console.log(`[OpenRouter] Starting request to ${OPENROUTER_MODEL}`)

  const systemPrompt = buildSystemPrompt(currentProfile, globalPreferences)

  // Check if using a reasoning model (grok, gpt-5, o1, etc.)
  const isReasoningModel = OPENROUTER_MODEL?.includes('grok') || OPENROUTER_MODEL?.includes('gpt-5')

  // Convert messages to OpenAI format, preserving reasoning_details for reasoning models
  const chatMessages: Record<string, unknown>[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => {
      const msg: Record<string, unknown> = {
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.role === 'user'
          ? (m.componentValues
            ? `${m.content}\n[User action: ${JSON.stringify(m.componentValues)}]`
            : m.content)
          : m.content
      }
      // Preserve reasoning_details for assistant messages (required for reasoning model continuity)
      if (m.role === 'assistant' && m.reasoning_details) {
        msg.reasoning_details = m.reasoning_details
      }
      return msg
    })
  ]

  // Detect user actions that require specific tool calls
  const lastMessage = messages[messages.length - 1]
  const componentValues = lastMessage?.componentValues || {}

  // Force specific tools based on user action (component-based)
  let forcedToolChoice: string | { type: string; function: { name: string } } = 'auto'
  if (componentValues.selected_deal_id) {
    forcedToolChoice = { type: 'function', function: { name: 'start_negotiation' } }
    console.log(`[OpenRouter] Forcing start_negotiation for deal: ${componentValues.selected_deal_id}`)
  } else if (componentValues.start_search === true) {
    forcedToolChoice = { type: 'function', function: { name: 'search_marketplace' } }
    console.log(`[OpenRouter] Forcing search_marketplace`)
  } else if (componentValues.budget_amount || componentValues.budget_unknown) {
    forcedToolChoice = { type: 'function', function: { name: 'ask_for_confirmation' } }
    console.log(`[OpenRouter] Forcing ask_for_confirmation after budget input`)
  } else if (componentValues.sent_message) {
    forcedToolChoice = { type: 'function', function: { name: 'show_negotiation_thread' } }
    console.log(`[OpenRouter] Forcing show_negotiation_thread after sent message`)
  } else if (componentValues.seller_response) {
    forcedToolChoice = { type: 'function', function: { name: 'generate_message_suggestions' } }
    console.log(`[OpenRouter] Forcing generate_message_suggestions after seller response`)
  }

  // Additional heuristic: detect free-text scenarios that should force tool calls
  // This helps ensure tools are called even when the AI might not naturally call them
  if (forcedToolChoice === 'auto' && lastMessage?.role === 'user' && !Object.keys(componentValues).length) {
    const userText = lastMessage.content.toLowerCase()
    const hasBudget = /\$\s*\d+|\d+\s*(dollars?|bucks?)|\bunder\s+\d+|\bmax\s+\d+|\bbudget\s+\d+/i.test(userText)
    const hasItem = userText.length > 3 && !userText.match(/^(hi|hey|hello|yes|no|ok|okay|sure|thanks|thank you)$/i)

    // If user provides item AND budget in free text, and we don't have an item yet, force ask_for_confirmation
    if (hasItem && hasBudget && !currentProfile.itemDescription) {
      forcedToolChoice = { type: 'function', function: { name: 'ask_for_confirmation' } }
      console.log(`[OpenRouter] Detected item+budget in free text, forcing ask_for_confirmation`)
    }
    // If user provides just an item (no budget), and we don't have an item yet, force ask_for_budget
    else if (hasItem && !hasBudget && !currentProfile.itemDescription) {
      forcedToolChoice = { type: 'function', function: { name: 'ask_for_budget' } }
      console.log(`[OpenRouter] Detected item in free text, forcing ask_for_budget`)
    }
  }

  const requestBody: Record<string, unknown> = {
    model: OPENROUTER_MODEL,
    messages: chatMessages,
    tools: AI_TOOLS,
    tool_choice: forcedToolChoice,
    stream: false,
  }

  // Reasoning models need different params
  if (isReasoningModel) {
    requestBody.reasoning = { enabled: true }
    requestBody.max_tokens = 500
  } else {
    requestBody.temperature = 0.3
    requestBody.max_tokens = 150
  }

  console.log(`[OpenRouter] Request body:`, JSON.stringify(requestBody, null, 2))

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://iris-deals.app',
      'X-Title': 'Iris',
    },
    body: JSON.stringify(requestBody),
  })
  console.log(`[OpenRouter] Response received: +${Date.now() - startTime}ms`)

  const text = await response.text()
  console.log(`[OpenRouter] Response text received: +${Date.now() - startTime}ms`)

  if (!response.ok) {
    console.error('OpenRouter error:', text)
    throw new Error(`OpenRouter API error: ${response.statusText}`)
  }

  const data = JSON.parse(text)
  console.log(`[OpenRouter] JSON parsed: +${Date.now() - startTime}ms`)
  const choice = data.choices[0]
  console.log(`[OpenRouter] Response:`, JSON.stringify(choice.message, null, 2))

  // Handle native tool calls if present
  let components: InteractiveComponent[] = []
  let profileUpdates: Partial<SearchProfile> = {}
  let stage: ConversationStage = currentProfile.foundDeals?.length ? 'showing_deals' : 'gathering_item'

  let overrideMessage: string | undefined

  if (choice.message.tool_calls) {
    console.log(`[OpenRouter] Processing ${choice.message.tool_calls.length} tool calls`)
    for (const tc of choice.message.tool_calls) {
      const parsed = parseToolCall(tc)
      if (parsed) {
        const result = await executeToolCall(
          { name: parsed.name, arguments: parsed.args as unknown as Record<string, unknown> },
          currentProfile,
          globalPreferences,
          componentValues
        )
        components = [...components, ...result.components]
        profileUpdates = { ...profileUpdates, ...result.profileUpdates }
        if (result.nextStage) stage = result.nextStage
        if (result.overrideMessage) overrideMessage = result.overrideMessage
      }
    }
  }

  // Use message content directly - no JSON parsing needed
  // Note: Some models (like gpt-5-mini) return empty content when calling tools
  // In that case, generate a contextual fallback message based on the tool called
  let message = choice.message.content || ''

  if (!message && choice.message.tool_calls?.length > 0) {
    // Generate fallback message based on the tool being called
    const toolName = choice.message.tool_calls[0].function.name
    let toolArgs: Record<string, unknown> = {}
    try {
      toolArgs = JSON.parse(choice.message.tool_calls[0].function.arguments || '{}')
    } catch { /* ignore parse errors */ }

    // Dynamic fallback for ask_for_confirmation based on what we know
    let confirmationFallback = "ready to search?"
    if (currentProfile.itemDescription && currentProfile.budgetMax) {
      confirmationFallback = `${currentProfile.itemDescription} under $${currentProfile.budgetMax}. ready to search?`
    } else if (currentProfile.itemDescription) {
      confirmationFallback = `${currentProfile.itemDescription}. ready to search?`
    } else if (toolArgs.summary) {
      confirmationFallback = `${toolArgs.summary}. ready?`
    }

    const fallbackMessages: Record<string, string> = {
      'ask_for_budget': "nice! what's your max budget?",
      'ask_for_confirmation': confirmationFallback,
      'search_marketplace': "on it!",
      'show_deal_details': "here's more info:",
      'start_negotiation': "nice pick! let's get you a deal",
      'generate_message_suggestions': "got it! here's what i'd say next:",
      'show_negotiation_thread': "sent! waiting for their reply...",
      'compare_deals': "let's compare these:",
    }
    message = fallbackMessages[toolName] || "here you go!"
    console.log(`[OpenRouter] Empty content with tool call, using fallback: "${message}"`)
  }

  // Preserve reasoning_details for multi-turn conversations with reasoning models
  const reasoning_details = choice.message.reasoning_details

  // If a tool call returned an override message (e.g., invalid demo product), use it instead
  if (overrideMessage) {
    message = overrideMessage
  }

  return {
    message,
    components,
    profile_updates: profileUpdates,
    stage,
    reasoning_details
  }
}

/**
 * Simulated response for demo/testing without API
 */
function simulateResponse(
  messages: ConversationMessage[],
  currentProfile: SearchProfile,
  _globalPreferences: GlobalPreferences
): {
  message: string
  components: InteractiveComponent[]
  profile_updates: Partial<SearchProfile>
  stage: ConversationStage
} {
  // This is the existing simulation logic - keeping it as fallback
  // Note: _globalPreferences is available for future use (e.g., customizing tone)
  const lastUserMessage = messages.filter(m => m.role === 'user').pop()
  const messageCount = messages.filter(m => m.role === 'user').length

  // Initial greeting
  if (messageCount === 0) {
    return {
      message: "hey! i'm iris - i help you find deals and negotiate prices on marketplace. try asking for an iphone, macbook, ps5, airpods, or something else!",
      components: [],
      profile_updates: {},
      stage: 'greeting'
    }
  }

  if (!lastUserMessage) {
    return {
      message: "hey, what are you looking for?",
      components: [],
      profile_updates: {},
      stage: 'gathering_item'
    }
  }

  const userText = lastUserMessage.content.toLowerCase()
  const componentValues = lastUserMessage.componentValues || {}

  // Handle deal selection
  if (componentValues.selected_deal_id) {
    const selectedDeal = currentProfile.foundDeals?.find(d => d.id === componentValues.selected_deal_id)
    if (selectedDeal) {
      const targetPrice = currentProfile.budgetMax
        ? Math.round(currentProfile.budgetMax * 0.8)
        : Math.round(selectedDeal.price * 0.8)

      return {
        message: `nice choice! here are some opening messages you could send:`,
        components: [
          {
            type: 'deal_card',
            id: 'selected_deal',
            deal: selectedDeal
          },
          {
            type: 'negotiation_suggestions',
            id: 'opening_messages',
            suggestions: [
              {
                id: 'friendly',
                label: 'Warm opener',
                message: `Hi! I'm interested in your ${selectedDeal.title.toLowerCase()}. Is it still available?`,
                style: 'friendly'
              },
              {
                id: 'direct',
                label: 'Direct offer',
                message: `Hey, is this still available? Would you take $${targetPrice}?`,
                style: 'direct'
              },
              {
                id: 'firm',
                label: 'Strong offer',
                message: `Hi, I can do $${targetPrice} cash and pick up today. Let me know.`,
                style: 'firm'
              }
            ]
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

  // Handle sent message
  if (componentValues.sent_message) {
    const currentMessages = currentProfile.negotiationMessages || []
    const newMessage: NegotiationMessage = {
      id: `buyer-${Date.now()}`,
      role: 'buyer',
      content: componentValues.sent_message as string,
      timestamp: new Date()
    }

    return {
      message: "sent! paste what the seller says back and i'll help you respond",
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

  // Handle seller response
  if (componentValues.seller_response) {
    const currentMessages = currentProfile.negotiationMessages || []
    const sellerMessage: NegotiationMessage = {
      id: `seller-${Date.now()}`,
      role: 'seller',
      content: componentValues.seller_response as string,
      timestamp: new Date()
    }
    const updatedMessages = [...currentMessages, sellerMessage]

    const selectedDeal = currentProfile.foundDeals?.find(d => d.id === currentProfile.selectedDealId)

    if (selectedDeal) {
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
            suggestions: [
              {
                id: 'friendly',
                label: 'Stay friendly',
                message: `Thanks for getting back! Would $${Math.round(selectedDeal.price * 0.9)} work if I pick up today?`,
                style: 'friendly'
              },
              {
                id: 'walk',
                label: 'Walk signal',
                message: `That's a bit over my budget. Let me know if you change your mind!`,
                style: 'direct'
              }
            ]
          }
        ],
        profile_updates: {
          negotiationMessages: updatedMessages
        },
        stage: 'negotiating'
      }
    }
  }

  // Handle confirmation
  if (componentValues.start_search === true) {
    return {
      message: `searching for ${currentProfile.itemDescription?.toLowerCase()}...`,
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
      message: "no problem, what do you want to change?",
      components: [],
      profile_updates: {},
      stage: 'gathering_preferences'
    }
  }

  // Parse user input for item/budget
  const updates: Partial<SearchProfile> = {}

  // Extract budget
  const budgetMatch = userText.match(/\$?\s*(\d+)/g)
  if (budgetMatch) {
    const numbers = budgetMatch.map(m => parseInt(m.replace(/\D/g, ''))).filter(n => n >= 10 && n <= 50000)
    if (numbers.length > 0) {
      updates.budgetMax = Math.max(...numbers)
    }
  }

  // Demo product categories with synonyms
  const categoryMap: Record<string, string[]> = {
    iphone: ['iphone', 'phone', 'smartphone', 'apple phone', 'mobile'],
    macbook: ['macbook', 'laptop', 'mac ', 'apple laptop', 'notebook', 'computer'],
    ps5: ['ps5', 'playstation', 'gaming console', 'game console', 'sony'],
    airpods: ['airpods', 'earbuds', 'headphones', 'wireless earbuds', 'earphones'],
    monitor: ['monitor', 'display', 'screen'],
    desk: ['desk', 'standing desk', 'work desk', 'office desk'],
    chair: ['chair', 'office chair', 'gaming chair', 'desk chair'],
    bike: ['bike', 'bicycle', 'road bike', 'mountain bike', 'cycling'],
    couch: ['couch', 'sofa', 'sectional', 'loveseat'],
  }

  // Try to match user input to a demo category
  let matchedCategory: string | null = null
  let matchedSynonym: string | null = null

  for (const [category, synonyms] of Object.entries(categoryMap)) {
    for (const syn of synonyms) {
      if (userText.includes(syn)) {
        matchedCategory = category
        matchedSynonym = syn
        break
      }
    }
    if (matchedCategory) break
  }

  if (matchedCategory) {
    // If matched via synonym (not exact category name), suggest the real category
    const exactCategories = Object.keys(categoryMap)
    if (matchedSynonym && !exactCategories.includes(matchedSynonym)) {
      return {
        message: `i don't have ${matchedSynonym}s but i can search for ${matchedCategory}s - want me to look?`,
        components: [],
        profile_updates: { itemDescription: matchedCategory },
        stage: 'gathering_item'
      }
    }
    updates.itemDescription = userText.split(/[,.]|\bfor\b|\bunder\b|\baround\b/)[0].trim()
  }

  // If user typed something but it's not in our demo categories, tell them
  if (!updates.itemDescription && userText.length > 2 && !userText.match(/^(hi|hey|hello|yes|no|ok|okay|sure|thanks|thank you|yeah|yep|yup|nope)$/i)) {
    return {
      message: "this demo has: iphones, macbooks, ps5, airpods, monitors, desks, chairs, bikes, and couches. which interests you?",
      components: [],
      profile_updates: {},
      stage: 'gathering_item'
    }
  }

  const newProfile = { ...currentProfile, ...updates }

  // Check if we have enough to confirm
  if (newProfile.itemDescription && newProfile.budgetMax) {
    return {
      message: `${newProfile.itemDescription} under $${newProfile.budgetMax}. ready to search?`,
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

  // Ask for missing info
  if (!newProfile.itemDescription) {
    if (userText.match(/^(hi|hey|hello)/)) {
      return {
        message: "hey! what are you looking for?",
        components: [],
        profile_updates: {},
        stage: 'gathering_item'
      }
    }
    return {
      message: "what are you trying to find?",
      components: [],
      profile_updates: updates,
      stage: 'gathering_item'
    }
  }

  if (!newProfile.budgetMax) {
    return {
      message: `nice, ${newProfile.itemDescription}. what's your budget?`,
      components: [],
      profile_updates: updates,
      stage: 'gathering_budget'
    }
  }

  return {
    message: "got it. anything else i should know?",
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

/**
 * Main entry point for getting AI response
 */
export async function getAIResponse(
  messages: ConversationMessage[],
  currentProfile: SearchProfile,
  globalPreferences: GlobalPreferences
): Promise<{
  message: string
  components: InteractiveComponent[]
  profile_updates: Partial<SearchProfile>
  stage: ConversationStage
  reasoning_details?: unknown[]
}> {
  if (SIMULATE_CALLS) {
    // Add artificial delay for realism
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200))
    return simulateResponse(messages, currentProfile, globalPreferences)
  }

  try {
    const response = await callOpenRouter(messages, currentProfile, globalPreferences)

    // Validate response - if model returns empty/malformed response, fall back to simulation
    if (!response.message && response.components.length === 0) {
      console.warn('OpenRouter returned empty response, falling back to simulation')
      return simulateResponse(messages, currentProfile, globalPreferences)
    }

    return response
  } catch (error) {
    console.error('OpenRouter call failed, falling back to simulation:', error)
    return simulateResponse(messages, currentProfile, globalPreferences)
  }
}

/**
 * Execute deal search (called after confirmation)
 */
export async function executeSearch(
  searchProfile: SearchProfile,
  globalPreferences: GlobalPreferences
): Promise<{
  message: string
  components: InteractiveComponent[]
  profile_updates: Partial<SearchProfile>
  stage: ConversationStage
}> {
  const listings = await marketplaceDatastore.search({
    query: searchProfile.itemDescription || '',
    budgetMax: searchProfile.budgetMax,
    budgetMin: searchProfile.budgetMin,
    maxDistanceKm: searchProfile.maxDistance || globalPreferences.maxDistanceKm,
    mustHaves: searchProfile.mustHaves,
    dealBreakers: searchProfile.dealBreakers,
  })

  const deals = listings.map(l => listingToDealCard(l, searchProfile, globalPreferences))
    .sort((a, b) => b.dealScore - a.dealScore)

  if (deals.length === 0) {
    return {
      message: "hmm couldn't find anything for that. for this demo, try searching for things like iphone, macbook, ps5, airpods, monitor, desk, chair, bike, or couch!",
      components: [],
      profile_updates: { itemDescription: undefined, budgetMax: undefined, isComplete: false },
      stage: 'gathering_item'
    }
  }

  return {
    message: `found ${deals.length} options! tap any to learn more:`,
    components: [
      {
        type: 'deal_carousel',
        id: 'deals',
        deals
      }
    ],
    profile_updates: { foundDeals: deals },
    stage: 'showing_deals'
  }
}
