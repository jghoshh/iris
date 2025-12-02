/**
 * AI Tools Definition
 *
 * Defines the tools available to the AI model for spawning rich UI components.
 * Uses OpenRouter's function calling format (OpenAI-compatible).
 */

import { DealCardData, NegotiationMessage } from '@/components/DealComponents'

// Tool definitions in OpenAI function calling format
export const AI_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'search_marketplace',
      description: 'Execute the marketplace search. MUST call this when user confirms (start_search=true action). Shows searching animation then results. If budget_unknown was set, use 9999 as budget_max.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The item to search for (e.g., "iPhone 13 Pro", "PS5", "mountain bike")'
          },
          budget_max: {
            type: 'number',
            description: 'Maximum budget in dollars. Use 9999 if user said they dont know their budget.'
          },
          budget_min: {
            type: 'number',
            description: 'Minimum budget in dollars (optional)'
          },
          urgency: {
            type: 'string',
            enum: ['asap', 'this_week', 'no_rush'],
            description: 'How urgently they need the item'
          }
        },
        required: ['query', 'budget_max']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'show_deal_details',
      description: 'Show expanded details for a specific deal. Use when user wants to know more about a particular listing.',
      parameters: {
        type: 'object',
        properties: {
          deal_id: {
            type: 'string',
            description: 'The ID of the deal to show details for'
          }
        },
        required: ['deal_id']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'start_negotiation',
      description: 'Start negotiation coaching for a selected deal. MUST call this IMMEDIATELY when user selects a deal (selected_deal_id action). Do NOT ask for confirmation - just start the negotiation flow with opening message suggestions.',
      parameters: {
        type: 'object',
        properties: {
          deal_id: {
            type: 'string',
            description: 'The ID of the deal to negotiate on'
          }
        },
        required: ['deal_id']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'generate_message_suggestions',
      description: 'Generate negotiation message suggestions based on the current conversation state. Use after user has sent a message or received a seller reply.',
      parameters: {
        type: 'object',
        properties: {
          deal_id: {
            type: 'string',
            description: 'The ID of the deal being negotiated'
          },
          context: {
            type: 'string',
            enum: ['opening', 'counter_offer', 'closing', 'walking_away'],
            description: 'The negotiation context'
          }
        },
        required: ['deal_id', 'context']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'show_negotiation_thread',
      description: 'Display the current negotiation thread. Call this after user sends a message to add it to the thread.',
      parameters: {
        type: 'object',
        properties: {
          deal_id: {
            type: 'string',
            description: 'The ID of the deal being negotiated'
          },
          new_message: {
            type: 'string',
            description: 'The message the buyer just sent (from sent_message action)'
          }
        },
        required: ['deal_id']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'compare_deals',
      description: 'Show a comparison view of multiple deals. Use when user is deciding between options.',
      parameters: {
        type: 'object',
        properties: {
          deal_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of deal IDs to compare'
          }
        },
        required: ['deal_ids']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'ask_for_confirmation',
      description: 'Show confirm/edit buttons before starting search. MUST call this when: 1) User provides budget amount or says they dont know budget, 2) User provides both item AND budget in one message. Shows a summary and lets user confirm or edit.',
      parameters: {
        type: 'object',
        properties: {
          summary: {
            type: 'string',
            description: 'Summary of what will happen (e.g., "search for iPhone 13 under $400")'
          },
          confirm_label: {
            type: 'string',
            description: 'Label for confirm button'
          },
          cancel_label: {
            type: 'string',
            description: 'Label for cancel button'
          }
        },
        required: ['summary']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'ask_for_budget',
      description: 'Show a budget input field. MUST call this when user mentions an item they want but has not provided a budget. IMPORTANT: Always include a text message asking for their budget (e.g. "what\'s your max budget?") along with this tool call. Do NOT call this if user already provided a budget - call ask_for_confirmation instead.',
      parameters: {
        type: 'object',
        properties: {
          item: {
            type: 'string',
            description: 'The item the user is looking for'
          }
        },
        required: ['item']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'respond',
      description: 'Send a text response without any UI components. Use this for greetings, answering questions, small talk, or any conversational response that does not require showing a UI component. Examples: "hey!", "what\'s your name?", "how does this work?", "yes", "no", "ok".',
      parameters: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'The text message to send to the user'
          }
        },
        required: ['message']
      }
    }
  }
]

// Tool result types
export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string // JSON string
  }
}

export interface SearchMarketplaceArgs {
  query: string
  budget_max: number
  budget_min?: number
  urgency?: 'asap' | 'this_week' | 'no_rush'
}

export interface ShowDealDetailsArgs {
  deal_id: string
}

export interface StartNegotiationArgs {
  deal_id: string
}

export interface GenerateMessageSuggestionsArgs {
  deal_id: string
  context: 'opening' | 'counter_offer' | 'closing' | 'walking_away'
}

export interface ShowNegotiationThreadArgs {
  deal_id: string
  new_message?: string
}

export interface CompareDealsArgs {
  deal_ids: string[]
}

export interface AskForConfirmationArgs {
  summary: string
  confirm_label?: string
  cancel_label?: string
}

export interface AskForBudgetArgs {
  item: string
}

// Context passed to tool execution
export interface ToolContext {
  foundDeals?: DealCardData[]
  selectedDealId?: string
  negotiationMessages?: NegotiationMessage[]
}

// Type for parsed tool arguments
export type ToolArgs =
  | { name: 'search_marketplace'; args: SearchMarketplaceArgs }
  | { name: 'show_deal_details'; args: ShowDealDetailsArgs }
  | { name: 'start_negotiation'; args: StartNegotiationArgs }
  | { name: 'generate_message_suggestions'; args: GenerateMessageSuggestionsArgs }
  | { name: 'show_negotiation_thread'; args: ShowNegotiationThreadArgs }
  | { name: 'compare_deals'; args: CompareDealsArgs }
  | { name: 'ask_for_confirmation'; args: AskForConfirmationArgs }
  | { name: 'ask_for_budget'; args: AskForBudgetArgs }

// Parse tool call from AI response
export function parseToolCall(toolCall: ToolCall): ToolArgs | null {
  try {
    const args = JSON.parse(toolCall.function.arguments)
    return { name: toolCall.function.name as ToolArgs['name'], args } as ToolArgs
  } catch {
    console.error('Failed to parse tool arguments:', toolCall.function.arguments)
    return null
  }
}
