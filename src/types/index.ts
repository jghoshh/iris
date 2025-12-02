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

// Hard Constraints for scoring
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

// Soft Preferences
export interface SoftPreferences {
  preferredBrands?: string[]
  preferredModels?: string[]
  preferredColors?: string[]
  importance: ImportanceWeights
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
