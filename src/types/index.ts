// Types used by the demo

export type Aggressiveness = 'conservative' | 'balanced' | 'aggressive'
export type Tone = 'polite_formal' | 'casual_friendly' | 'direct_concise'

// Global Preferences
export interface GlobalPreferences {
  aggressiveness: Aggressiveness
  maxDistanceKm: number
  tone: Tone
  avoidCashOnly: boolean
  avoidUnratedSellers: boolean
  avoidOffPlatform: boolean
}

export const defaultGlobalPreferences: GlobalPreferences = {
  aggressiveness: 'balanced',
  maxDistanceKm: 50,
  tone: 'casual_friendly',
  avoidCashOnly: false,
  avoidUnratedSellers: false,
  avoidOffPlatform: false,
}

// Hard Constraints for Session
export interface HardConstraints {
  [key: string]: string | number | boolean
}

// Importance weights for soft preferences
export interface ImportanceWeights {
  price: number
  condition: number
  distance: number
  urgency: number
}

// Soft Preferences for Session
export interface SoftPreferences {
  preferredBrands?: string[]
  preferredModels?: string[]
  preferredColors?: string[]
  importance: ImportanceWeights
}

export const defaultSoftPreferences: SoftPreferences = {
  preferredBrands: [],
  preferredModels: [],
  preferredColors: [],
  importance: {
    price: 0.5,
    condition: 0.3,
    distance: 0.2,
    urgency: 0.0,
  },
}

// Listing Attributes
export interface ListingAttributes {
  [key: string]: string | number | boolean
}

// Scores
export interface DealScores {
  fitScore: number
  priceScore: number
  riskScore: number
  leverageScore: number
  dealScore: number
}

// Session Summary for list view
export interface SessionSummary {
  id: string
  name: string
  status: string
  activeDealsCount: number
  highestDealScore: number | null
  statusSummary: string
  createdAt: Date
}
