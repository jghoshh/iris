import {
  HardConstraints,
  SoftPreferences,
  ListingAttributes,
  DealScores,
} from '@/types'

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Calculate FitScore (0-100)
 * - If any hard constraint is violated, FitScore <= 40
 * - Points added for soft attribute matches
 * - Points subtracted for mismatches on important attributes
 */
export function calculateFitScore(
  hardConstraints: HardConstraints,
  softPreferences: SoftPreferences,
  listingAttributes: ListingAttributes,
  listingDescription: string | null
): number {
  let score = 50

  // Check hard constraints
  let hardConstraintViolated = false
  for (const [key, value] of Object.entries(hardConstraints)) {
    // Handle min/max constraints
    if (key.endsWith('_min')) {
      const attrKey = key.replace('_min', '')
      const attrValue = listingAttributes[attrKey]
      if (attrValue !== undefined && typeof attrValue === 'number' && typeof value === 'number') {
        if (attrValue < value) {
          hardConstraintViolated = true
          break
        }
      }
    } else if (key.endsWith('_max')) {
      const attrKey = key.replace('_max', '')
      const attrValue = listingAttributes[attrKey]
      if (attrValue !== undefined && typeof attrValue === 'number' && typeof value === 'number') {
        if (attrValue > value) {
          hardConstraintViolated = true
          break
        }
      }
    } else {
      // Exact match constraint
      const attrValue = listingAttributes[key]
      if (attrValue !== undefined && attrValue !== value) {
        hardConstraintViolated = true
        break
      }
    }
  }

  if (hardConstraintViolated) {
    score = Math.min(score, 40)
  } else {
    score += 20
  }

  // Check soft preferences
  const { preferredBrands, preferredColors, preferredModels } = softPreferences
  const brand = listingAttributes['brand'] as string | undefined
  const color = listingAttributes['color'] as string | undefined
  const model = listingAttributes['model'] as string | undefined

  if (preferredBrands?.length && brand) {
    if (preferredBrands.some(b => b.toLowerCase() === brand.toLowerCase())) {
      score += 7
    }
  }

  if (preferredColors?.length && color) {
    if (preferredColors.some(c => c.toLowerCase() === color.toLowerCase())) {
      score += 5
    }
  }

  if (preferredModels?.length && model) {
    if (preferredModels.some(m => m.toLowerCase() === model.toLowerCase())) {
      score += 8
    }
  }

  // Infer condition from description
  if (listingDescription) {
    const descLower = listingDescription.toLowerCase()
    const positiveWords = ['excellent', 'mint', 'perfect', 'new', 'pristine', 'like new']
    const negativeWords = ['broken', 'damaged', 'cracked', 'scratched', 'worn', 'issue']

    const hasPositive = positiveWords.some(w => descLower.includes(w))
    const hasNegative = negativeWords.some(w => descLower.includes(w))

    if (hasPositive && !hasNegative) {
      score += 10
    } else if (hasNegative && !hasPositive) {
      score -= 10
    }
  }

  return clamp(score, 0, 100)
}

/**
 * Calculate PriceScore (0-100)
 * - If asking price > 1.5 * budget_max, score < 30
 * - If asking price <= budget_max and close to target, higher score
 */
export function calculatePriceScore(
  askingPrice: number,
  budgetMin: number | null,
  budgetMax: number | null,
  targetPrice: number | null
): number {
  if (!budgetMax) {
    return 50 // Default if no budget set
  }

  // Very expensive relative to budget
  if (askingPrice > budgetMax * 1.5) {
    return 20
  }

  // Above budget but not excessively
  if (askingPrice > budgetMax) {
    const overBy = (askingPrice - budgetMax) / budgetMax
    return clamp(50 - overBy * 50, 25, 50)
  }

  // Within budget
  const target = targetPrice ?? budgetMax * 0.85
  const min = budgetMin ?? budgetMax * 0.5

  // Perfect price (at or below target)
  if (askingPrice <= target) {
    const savings = (target - askingPrice) / (target - min || 1)
    return clamp(80 + savings * 20, 80, 100)
  }

  // Between target and max
  const aboveTarget = (askingPrice - target) / (budgetMax - target || 1)
  return clamp(80 - aboveTarget * 30, 50, 80)
}

/**
 * Calculate RiskScore (0-100, higher = lower risk)
 * - Start at 70
 * - Deduct for red flags in description/chat
 * - Deduct for long distance
 */
export function calculateRiskScore(
  listingDescription: string | null,
  distanceKm: number | null,
  maxDistanceKm: number,
  avoidCashOnly: boolean,
  avoidOffPlatform: boolean
): number {
  let score = 70

  if (listingDescription) {
    const descLower = listingDescription.toLowerCase()

    // Red flags
    const redFlags = [
      { pattern: 'no returns', penalty: 10 },
      { pattern: 'cash only', penalty: avoidCashOnly ? 20 : 5 },
      { pattern: 'meet at home', penalty: 10 },
      { pattern: 'venmo', penalty: avoidOffPlatform ? 15 : 5 },
      { pattern: 'zelle', penalty: avoidOffPlatform ? 15 : 5 },
      { pattern: 'wire transfer', penalty: 25 },
      { pattern: 'urgent', penalty: 5 },
      { pattern: 'need gone', penalty: 0 }, // Actually good for buyer leverage
      { pattern: 'firm', penalty: 5 },
    ]

    for (const { pattern, penalty } of redFlags) {
      if (descLower.includes(pattern)) {
        score -= penalty
      }
    }

    // Positive indicators
    const positives = [
      { pattern: 'receipt', bonus: 10 },
      { pattern: 'warranty', bonus: 10 },
      { pattern: 'original box', bonus: 5 },
      { pattern: 'never used', bonus: 5 },
    ]

    for (const { pattern, bonus } of positives) {
      if (descLower.includes(pattern)) {
        score += bonus
      }
    }
  }

  // Distance penalty
  if (distanceKm !== null && maxDistanceKm > 0) {
    if (distanceKm > maxDistanceKm) {
      score -= 15
    } else if (distanceKm > maxDistanceKm * 0.8) {
      score -= 5
    }
  }

  return clamp(score, 0, 100)
}

/**
 * Calculate LeverageScore (1-5)
 * - Based on listing age, alternatives, chat signals, market rarity
 */
export function calculateLeverageScore(
  postedDaysAgo: number | null,
  askingPrice: number,
  budgetMax: number | null,
  listingDescription: string | null,
  alternativeDealsCount: number
): number {
  let score = 3 // Start balanced

  // Listing age
  if (postedDaysAgo !== null) {
    if (postedDaysAgo > 14) {
      score += 1.5 // Old listing, seller may be eager
    } else if (postedDaysAgo > 7) {
      score += 0.5
    } else if (postedDaysAgo < 2) {
      score -= 0.5 // Fresh listing, seller has time
    }
  }

  // Price relative to budget
  if (budgetMax && askingPrice > budgetMax) {
    score += 0.5 // Seller asking too high, more room to negotiate
  }

  // Chat signals from description
  if (listingDescription) {
    const descLower = listingDescription.toLowerCase()

    if (descLower.includes('need gone') || descLower.includes('must sell')) {
      score += 1
    }
    if (descLower.includes('obo') || descLower.includes('or best offer')) {
      score += 0.5
    }
    if (descLower.includes('firm') || descLower.includes('no lowball')) {
      score -= 1
    }
  }

  // Alternative deals
  if (alternativeDealsCount >= 3) {
    score += 0.5 // More alternatives = more leverage
  }

  return clamp(Math.round(score), 1, 5)
}

/**
 * Calculate overall DealScore (0-100)
 * DealScore = 0.4 * FitScore + 0.3 * PriceScore + 0.2 * RiskScore + 0.1 * (LeverageScore * 20)
 */
export function calculateDealScore(
  fitScore: number,
  priceScore: number,
  riskScore: number,
  leverageScore: number
): number {
  const score =
    0.4 * fitScore +
    0.3 * priceScore +
    0.2 * riskScore +
    0.1 * (leverageScore * 20)

  return clamp(Math.round(score), 0, 100)
}

/**
 * Calculate all scores for a deal
 */
export function calculateAllScores(
  hardConstraints: HardConstraints,
  softPreferences: SoftPreferences,
  listingAttributes: ListingAttributes,
  listingDescription: string | null,
  askingPrice: number,
  budgetMin: number | null,
  budgetMax: number | null,
  targetPrice: number | null,
  distanceKm: number | null,
  maxDistanceKm: number,
  avoidCashOnly: boolean,
  avoidOffPlatform: boolean,
  postedDaysAgo: number | null,
  alternativeDealsCount: number
): DealScores {
  const fitScore = calculateFitScore(
    hardConstraints,
    softPreferences,
    listingAttributes,
    listingDescription
  )

  const priceScore = calculatePriceScore(
    askingPrice,
    budgetMin,
    budgetMax,
    targetPrice
  )

  const riskScore = calculateRiskScore(
    listingDescription,
    distanceKm,
    maxDistanceKm,
    avoidCashOnly,
    avoidOffPlatform
  )

  const leverageScore = calculateLeverageScore(
    postedDaysAgo,
    askingPrice,
    budgetMax,
    listingDescription,
    alternativeDealsCount
  )

  const dealScore = calculateDealScore(fitScore, priceScore, riskScore, leverageScore)

  return {
    fitScore,
    priceScore,
    riskScore,
    leverageScore,
    dealScore,
  }
}
