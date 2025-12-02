/**
 * Marketplace Datastore Abstraction
 *
 * This module provides a unified interface for fetching marketplace listings.
 * Currently uses mock data, but designed to be swapped for real marketplace
 * integrations (scrapers, APIs, browser extension data) in the future.
 *
 * To swap implementations:
 * 1. Create a new class implementing MarketplaceDatastore interface
 * 2. Update the export at the bottom of this file
 */

export interface MarketplaceListing {
  id: string
  title: string
  price: number
  description: string
  imageUrl: string
  marketplace: 'facebook' | 'craigslist' | 'offerup' | 'other'
  location: string
  distanceKm: number
  postedDaysAgo: number
  sellerName: string
  sellerRating: number | null // null = no ratings
  sellerJoinedMonthsAgo: number
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor'
  attributes: Record<string, string | number | boolean>
}

export interface SearchCriteria {
  query: string
  budgetMin?: number
  budgetMax?: number
  maxDistanceKm?: number
  mustHaves?: string[]
  dealBreakers?: string[]
}

export interface MarketplaceDatastore {
  search(criteria: SearchCriteria): Promise<MarketplaceListing[]>
  getById(id: string): Promise<MarketplaceListing | null>
  getAll(): Promise<MarketplaceListing[]>
}

// Mock data templates for different product categories
const MOCK_LISTINGS_BY_CATEGORY: Record<string, Omit<MarketplaceListing, 'id'>[]> = {
  iphone: [
    {
      title: 'iPhone 13 Pro 256GB - Graphite',
      price: 450,
      description: 'Excellent condition, always had a case and screen protector. Battery health 89%. Includes original box and charger. No scratches or dents.',
      imageUrl: '/mock/iphone-13-pro.jpg',
      marketplace: 'facebook',
      location: 'Downtown',
      distanceKm: 3.2,
      postedDaysAgo: 2,
      sellerName: 'Mike T.',
      sellerRating: 4.8,
      sellerJoinedMonthsAgo: 24,
      condition: 'like_new',
      attributes: { storage: '256GB', color: 'Graphite', batteryHealth: 89 }
    },
    {
      title: 'iPhone 13 Pro Max 128GB - Gold',
      price: 520,
      description: 'Used for 1 year. Screen has minor scratches (not visible when on). Battery health 85%. Cash only, meet at police station.',
      imageUrl: '/mock/iphone-13-pro-max.jpg',
      marketplace: 'facebook',
      location: 'Westside',
      distanceKm: 8.5,
      postedDaysAgo: 5,
      sellerName: 'Sarah K.',
      sellerRating: 4.2,
      sellerJoinedMonthsAgo: 18,
      condition: 'good',
      attributes: { storage: '128GB', color: 'Gold', batteryHealth: 85 }
    },
    {
      title: 'iPhone 13 128GB - Blue - NEED GONE TODAY',
      price: 340,
      description: 'Moving out of state, must sell today! Works perfectly. Small crack on back glass (doesnt affect function). OBO - serious buyers only.',
      imageUrl: '/mock/iphone-13.jpg',
      marketplace: 'craigslist',
      location: 'East End',
      distanceKm: 12.1,
      postedDaysAgo: 14,
      sellerName: 'Jason',
      sellerRating: null,
      sellerJoinedMonthsAgo: 2,
      condition: 'fair',
      attributes: { storage: '128GB', color: 'Blue', batteryHealth: 92 }
    },
    {
      title: 'iPhone 13 Pro 256GB - Sierra Blue - Mint',
      price: 480,
      description: 'Pristine condition. AppleCare+ until March 2025. Battery health 94%. Original receipt available. Can meet anywhere public.',
      imageUrl: '/mock/iphone-13-pro-blue.jpg',
      marketplace: 'offerup',
      location: 'Midtown',
      distanceKm: 5.0,
      postedDaysAgo: 1,
      sellerName: 'Alex R.',
      sellerRating: 5.0,
      sellerJoinedMonthsAgo: 36,
      condition: 'like_new',
      attributes: { storage: '256GB', color: 'Sierra Blue', batteryHealth: 94, hasAppleCare: true }
    },
    {
      title: 'iPhone 13 Mini 128GB - Pink',
      price: 280,
      description: 'Great little phone, upgrading to bigger screen. Some wear on edges but screen perfect. Battery 88%. Venmo preferred.',
      imageUrl: '/mock/iphone-13-mini.jpg',
      marketplace: 'facebook',
      location: 'Suburbs',
      distanceKm: 18.3,
      postedDaysAgo: 7,
      sellerName: 'Emily W.',
      sellerRating: 4.5,
      sellerJoinedMonthsAgo: 12,
      condition: 'good',
      attributes: { storage: '128GB', color: 'Pink', batteryHealth: 88 }
    },
  ],
  macbook: [
    {
      title: 'MacBook Pro 14" M1 Pro - 16GB/512GB',
      price: 1450,
      description: 'Like new, only used for 3 months. Includes original box, charger, and AppleCare receipt. 97% battery cycle count: 42.',
      imageUrl: '/mock/macbook-pro-14.jpg',
      marketplace: 'facebook',
      location: 'Tech District',
      distanceKm: 4.5,
      postedDaysAgo: 3,
      sellerName: 'David L.',
      sellerRating: 4.9,
      sellerJoinedMonthsAgo: 48,
      condition: 'like_new',
      attributes: { chip: 'M1 Pro', ram: '16GB', storage: '512GB', batteryCycles: 42 }
    },
    {
      title: 'MacBook Air M1 - 8GB/256GB - Space Gray',
      price: 650,
      description: 'Perfect for students. Some light scratches on bottom. Battery health excellent. No charger included (uses standard USB-C).',
      imageUrl: '/mock/macbook-air-m1.jpg',
      marketplace: 'craigslist',
      location: 'University Area',
      distanceKm: 6.2,
      postedDaysAgo: 8,
      sellerName: 'College Student',
      sellerRating: null,
      sellerJoinedMonthsAgo: 1,
      condition: 'good',
      attributes: { chip: 'M1', ram: '8GB', storage: '256GB', batteryCycles: 89 }
    },
    {
      title: 'MacBook Pro 16" M1 Max - 32GB/1TB - FIRM',
      price: 2200,
      description: 'Beast of a machine. Used for video editing. Minor dent on corner (see pics). Price is firm, no lowballers. Cash only.',
      imageUrl: '/mock/macbook-pro-16.jpg',
      marketplace: 'offerup',
      location: 'North Side',
      distanceKm: 15.0,
      postedDaysAgo: 12,
      sellerName: 'Pro Editor',
      sellerRating: 3.8,
      sellerJoinedMonthsAgo: 8,
      condition: 'good',
      attributes: { chip: 'M1 Max', ram: '32GB', storage: '1TB', batteryCycles: 156 }
    },
  ],
  ps5: [
    {
      title: 'PS5 Disc Edition + 2 Controllers',
      price: 420,
      description: 'Works great, just dont play anymore. Includes HDMI cable, power cable, 2 DualSense controllers. Can show it working.',
      imageUrl: '/mock/ps5-disc.jpg',
      marketplace: 'facebook',
      location: 'Riverside',
      distanceKm: 7.8,
      postedDaysAgo: 4,
      sellerName: 'Gamer Dad',
      sellerRating: 4.6,
      sellerJoinedMonthsAgo: 30,
      condition: 'like_new',
      attributes: { edition: 'Disc', controllers: 2, games: 0 }
    },
    {
      title: 'PS5 Digital + 5 Games (codes)',
      price: 380,
      description: 'Digital edition. Comes with download codes for: Spider-Man 2, God of War, Horizon, Last of Us, GT7. Must meet at my place to show working.',
      imageUrl: '/mock/ps5-digital.jpg',
      marketplace: 'craigslist',
      location: 'Apartment Complex',
      distanceKm: 9.4,
      postedDaysAgo: 6,
      sellerName: 'Quick Sale',
      sellerRating: null,
      sellerJoinedMonthsAgo: 0,
      condition: 'good',
      attributes: { edition: 'Digital', controllers: 1, games: 5 }
    },
    {
      title: 'PS5 Disc - Like New in Box',
      price: 450,
      description: 'Bought as gift, opened but barely used. Maybe 10 hours total. Still has plastic on stand. Receipt from Best Buy available.',
      imageUrl: '/mock/ps5-boxed.jpg',
      marketplace: 'offerup',
      location: 'Shopping Center',
      distanceKm: 2.1,
      postedDaysAgo: 1,
      sellerName: 'Maria G.',
      sellerRating: 5.0,
      sellerJoinedMonthsAgo: 60,
      condition: 'new',
      attributes: { edition: 'Disc', controllers: 1, games: 0, hasReceipt: true }
    },
  ],
  bike: [
    {
      title: 'Trek Domane AL 2 - 56cm - 2023',
      price: 750,
      description: 'Road bike in excellent condition. New tires, recently tuned. Perfect for commuting or weekend rides. Test ride welcome.',
      imageUrl: '/mock/trek-domane.jpg',
      marketplace: 'facebook',
      location: 'Bike Shop Area',
      distanceKm: 5.5,
      postedDaysAgo: 3,
      sellerName: 'Cycling Mike',
      sellerRating: 4.9,
      sellerJoinedMonthsAgo: 42,
      condition: 'like_new',
      attributes: { type: 'road', brand: 'Trek', size: '56cm', year: 2023 }
    },
    {
      title: 'Specialized Rockhopper - Mountain Bike - OBO',
      price: 400,
      description: 'Great mountain bike, upgrading to full suspension. Some scratches from trail use. Hydraulic brakes work perfect. Or best offer!',
      imageUrl: '/mock/specialized-rockhopper.jpg',
      marketplace: 'craigslist',
      location: 'Trail Head',
      distanceKm: 22.0,
      postedDaysAgo: 10,
      sellerName: 'Trail Rider',
      sellerRating: 4.2,
      sellerJoinedMonthsAgo: 15,
      condition: 'good',
      attributes: { type: 'mountain', brand: 'Specialized', size: 'Large', year: 2021 }
    },
  ],
  couch: [
    {
      title: 'West Elm Harmony Sofa - Gray - Like New',
      price: 1200,
      description: 'Moving sale. Bought 6 months ago for $2400. No pets, no kids, no stains. You must pick up - its heavy! Can help load.',
      imageUrl: '/mock/west-elm-sofa.jpg',
      marketplace: 'facebook',
      location: 'Luxury Apartments',
      distanceKm: 8.0,
      postedDaysAgo: 2,
      sellerName: 'Moving Soon',
      sellerRating: 4.7,
      sellerJoinedMonthsAgo: 20,
      condition: 'like_new',
      attributes: { brand: 'West Elm', model: 'Harmony', color: 'Gray', material: 'Fabric' }
    },
    {
      title: 'IKEA Sectional - MUST GO THIS WEEKEND',
      price: 250,
      description: 'IKEA Friheten sleeper sectional. Some wear but still comfortable. Has storage. Need gone by Sunday - price negotiable if you can pick up today.',
      imageUrl: '/mock/ikea-sectional.jpg',
      marketplace: 'facebook',
      location: 'Suburbs',
      distanceKm: 14.5,
      postedDaysAgo: 5,
      sellerName: 'Quick Move',
      sellerRating: null,
      sellerJoinedMonthsAgo: 6,
      condition: 'fair',
      attributes: { brand: 'IKEA', model: 'Friheten', color: 'Dark Gray', hasSleeper: true }
    },
    {
      title: 'Leather Couch - Real Leather - Vintage',
      price: 800,
      description: 'Beautiful genuine leather sofa. Some patina adds character. Very sturdy, solid wood frame. No lowball offers. Cash only, no delivery.',
      imageUrl: '/mock/leather-couch.jpg',
      marketplace: 'craigslist',
      location: 'Antique District',
      distanceKm: 11.2,
      postedDaysAgo: 18,
      sellerName: 'Vintage Finds',
      sellerRating: 3.5,
      sellerJoinedMonthsAgo: 36,
      condition: 'good',
      attributes: { brand: 'Unknown', material: 'Leather', color: 'Brown', style: 'Vintage' }
    },
  ],
  airpods: [
    {
      title: 'AirPods Pro 2 - USB-C - Like New',
      price: 180,
      description: 'Bought 3 months ago. Work perfectly. Includes original box and all ear tips. Selling because I got the Max.',
      imageUrl: '/mock/airpods-pro-2.jpg',
      marketplace: 'facebook',
      location: 'Coffee Shop District',
      distanceKm: 3.5,
      postedDaysAgo: 1,
      sellerName: 'Audio Upgrade',
      sellerRating: 4.9,
      sellerJoinedMonthsAgo: 24,
      condition: 'like_new',
      attributes: { model: 'Pro 2', connector: 'USB-C', hasCase: true }
    },
    {
      title: 'AirPods Pro 2 - Sealed Box',
      price: 200,
      description: 'Brand new sealed. Got as work bonus, already have a pair.',
      imageUrl: '/mock/airpods-pro-sealed.jpg',
      marketplace: 'offerup',
      location: 'Office Park',
      distanceKm: 7.2,
      postedDaysAgo: 2,
      sellerName: 'Corporate Worker',
      sellerRating: 5.0,
      sellerJoinedMonthsAgo: 40,
      condition: 'new',
      attributes: { model: 'Pro 2', sealed: true }
    },
    {
      title: 'AirPods 3rd Gen - Good Condition',
      price: 100,
      description: 'Work great, some scratches on case. Battery life still good.',
      imageUrl: '/mock/airpods-3.jpg',
      marketplace: 'facebook',
      location: 'Student Housing',
      distanceKm: 9.8,
      postedDaysAgo: 6,
      sellerName: 'Student Sale',
      sellerRating: 4.3,
      sellerJoinedMonthsAgo: 8,
      condition: 'good',
      attributes: { model: '3rd Gen', hasCase: true }
    },
  ],
  monitor: [
    {
      title: 'LG 27" 4K Monitor - USB-C',
      price: 280,
      description: 'Great for Mac users. USB-C with 60W charging. IPS panel, beautiful colors.',
      imageUrl: '/mock/lg-27-4k.jpg',
      marketplace: 'facebook',
      location: 'Tech Hub',
      distanceKm: 5.2,
      postedDaysAgo: 3,
      sellerName: 'WFH Setup',
      sellerRating: 4.8,
      sellerJoinedMonthsAgo: 18,
      condition: 'like_new',
      attributes: { brand: 'LG', size: '27"', resolution: '4K', panel: 'IPS' }
    },
    {
      title: 'Dell S2722QC 27" 4K - With Box',
      price: 250,
      description: 'Excellent monitor. USB-C hub built in. Includes all original cables and box.',
      imageUrl: '/mock/dell-s27.jpg',
      marketplace: 'offerup',
      location: 'Business District',
      distanceKm: 8.0,
      postedDaysAgo: 5,
      sellerName: 'Office Upgrade',
      sellerRating: 4.5,
      sellerJoinedMonthsAgo: 32,
      condition: 'good',
      attributes: { brand: 'Dell', size: '27"', resolution: '4K', hasUSBC: true }
    },
    {
      title: 'Samsung Odyssey G7 32" Curved Gaming',
      price: 450,
      description: '240Hz, 1ms response. Best gaming monitor. No dead pixels.',
      imageUrl: '/mock/samsung-g7.jpg',
      marketplace: 'facebook',
      location: 'Gaming Den',
      distanceKm: 12.5,
      postedDaysAgo: 2,
      sellerName: 'Pro Gamer',
      sellerRating: 4.9,
      sellerJoinedMonthsAgo: 48,
      condition: 'like_new',
      attributes: { brand: 'Samsung', size: '32"', resolution: '1440p', refreshRate: 240 }
    },
  ],
  desk: [
    {
      title: 'UPLIFT V2 Standing Desk - 60x30 - Walnut',
      price: 550,
      description: 'Best standing desk. Dual motor, memory presets. Walnut laminate top. Must pick up.',
      imageUrl: '/mock/uplift-desk.jpg',
      marketplace: 'facebook',
      location: 'Home Office',
      distanceKm: 7.5,
      postedDaysAgo: 3,
      sellerName: 'Remote Worker',
      sellerRating: 4.6,
      sellerJoinedMonthsAgo: 20,
      condition: 'good',
      attributes: { brand: 'UPLIFT', model: 'V2', size: '60x30', motorized: true }
    },
    {
      title: 'IKEA BEKANT Sit-Stand - White - Like New',
      price: 280,
      description: 'Electric standing desk. Works perfectly. Clean white top. Moving to smaller place.',
      imageUrl: '/mock/ikea-bekant.jpg',
      marketplace: 'facebook',
      location: 'Apartment Complex',
      distanceKm: 5.8,
      postedDaysAgo: 1,
      sellerName: 'Moving Out',
      sellerRating: 4.4,
      sellerJoinedMonthsAgo: 12,
      condition: 'like_new',
      attributes: { brand: 'IKEA', model: 'BEKANT', color: 'White', motorized: true }
    },
  ],
  chair: [
    {
      title: 'Herman Miller Aeron - Size B - Fully Loaded',
      price: 650,
      description: 'The gold standard. PostureFit, adjustable arms, lumbar. Some wear on arm pads.',
      imageUrl: '/mock/aeron-chair.jpg',
      marketplace: 'facebook',
      location: 'Corporate Office',
      distanceKm: 8.5,
      postedDaysAgo: 4,
      sellerName: 'Office Liquidation',
      sellerRating: 4.8,
      sellerJoinedMonthsAgo: 36,
      condition: 'good',
      attributes: { brand: 'Herman Miller', model: 'Aeron', size: 'B' }
    },
    {
      title: 'Steelcase Leap V2 - Black - Excellent',
      price: 450,
      description: 'Best chair for long work sessions. All adjustments work. Recently cleaned.',
      imageUrl: '/mock/steelcase-leap.jpg',
      marketplace: 'offerup',
      location: 'Business Park',
      distanceKm: 11.0,
      postedDaysAgo: 6,
      sellerName: 'Ergonomic Fan',
      sellerRating: 4.9,
      sellerJoinedMonthsAgo: 42,
      condition: 'like_new',
      attributes: { brand: 'Steelcase', model: 'Leap V2', color: 'Black' }
    },
    {
      title: 'Secretlab Titan - Gaming Chair',
      price: 320,
      description: 'Comfortable gaming chair. Good for long sessions. Light wear.',
      imageUrl: '/mock/secretlab-titan.jpg',
      marketplace: 'facebook',
      location: 'Gaming Setup',
      distanceKm: 6.2,
      postedDaysAgo: 2,
      sellerName: 'Gamer Chair',
      sellerRating: 4.5,
      sellerJoinedMonthsAgo: 18,
      condition: 'good',
      attributes: { brand: 'Secretlab', model: 'Titan' }
    },
  ],
}

// Default listings for unrecognized queries
const DEFAULT_LISTINGS: Omit<MarketplaceListing, 'id'>[] = [
  {
    title: 'Various Items - Make Offer',
    price: 100,
    description: 'Cleaning out garage. Have lots of stuff. Message me what youre looking for.',
    imageUrl: '/mock/garage-sale.jpg',
    marketplace: 'facebook',
    location: 'Residential',
    distanceKm: 10.0,
    postedDaysAgo: 7,
    sellerName: 'Garage Sale',
    sellerRating: 4.0,
    sellerJoinedMonthsAgo: 24,
    condition: 'fair',
    attributes: {}
  },
]

/**
 * Mock implementation of MarketplaceDatastore
 * Returns realistic fake listings based on search criteria
 */
class MockMarketplaceDatastore implements MarketplaceDatastore {
  private idCounter = 0
  private listingsCache: Map<string, MarketplaceListing> = new Map()

  private generateId(): string {
    return `mock-${++this.idCounter}-${Date.now()}`
  }

  private detectCategory(query: string): string | null {
    const queryLower = query.toLowerCase()

    const categoryKeywords: Record<string, string[]> = {
      iphone: ['iphone', 'iphone 13', 'iphone 14', 'iphone 15', 'apple phone'],
      macbook: ['macbook', 'mac book', 'macbook pro', 'macbook air', 'apple laptop', 'mac laptop'],
      ps5: ['ps5', 'playstation 5', 'playstation5', 'sony playstation', 'playstation'],
      bike: ['bike', 'bicycle', 'road bike', 'mountain bike', 'cycling'],
      couch: ['couch', 'sofa', 'sectional', 'loveseat'],
      airpods: ['airpods', 'air pods', 'airpod'],
      monitor: ['monitor', 'display', 'screen', '4k monitor', 'gaming monitor'],
      desk: ['desk', 'standing desk', 'sit stand', 'computer desk'],
      chair: ['chair', 'office chair', 'gaming chair', 'aeron', 'ergonomic chair'],
    }

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(kw => queryLower.includes(kw))) {
        return category
      }
    }

    return null
  }

  private applyFilters(
    listings: MarketplaceListing[],
    criteria: SearchCriteria
  ): MarketplaceListing[] {
    return listings.filter(listing => {
      // Budget filter
      if (criteria.budgetMax && listing.price > criteria.budgetMax * 1.3) {
        return false
      }

      // Distance filter
      if (criteria.maxDistanceKm && listing.distanceKm > criteria.maxDistanceKm) {
        return false
      }

      return true
    })
  }

  private addVariation(listing: Omit<MarketplaceListing, 'id'>): MarketplaceListing {
    // Add slight random variations to make data feel more real
    const priceVariation = 1 + (Math.random() - 0.5) * 0.1 // +/- 5%
    const distanceVariation = 1 + (Math.random() - 0.5) * 0.2 // +/- 10%

    const newListing: MarketplaceListing = {
      ...listing,
      id: this.generateId(),
      price: Math.round(listing.price * priceVariation),
      distanceKm: Math.round(listing.distanceKm * distanceVariation * 10) / 10,
      postedDaysAgo: listing.postedDaysAgo + Math.floor(Math.random() * 2),
    }

    // Cache for later lookup by ID
    this.listingsCache.set(newListing.id, newListing)

    return newListing
  }

  async search(criteria: SearchCriteria): Promise<MarketplaceListing[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500))

    const category = this.detectCategory(criteria.query)
    const templates = category
      ? MOCK_LISTINGS_BY_CATEGORY[category] || DEFAULT_LISTINGS
      : DEFAULT_LISTINGS

    // Generate listings from templates with variations
    const listings = templates.map(template => this.addVariation(template))

    // Apply filters
    const filtered = this.applyFilters(listings, criteria)

    // Sort by relevance (for now, just by price within budget)
    return filtered.sort((a, b) => {
      // Prefer items closer to budget max (better value)
      const aScore = criteria.budgetMax ? Math.abs(a.price - criteria.budgetMax * 0.8) : a.price
      const bScore = criteria.budgetMax ? Math.abs(b.price - criteria.budgetMax * 0.8) : b.price
      return aScore - bScore
    })
  }

  async getById(id: string): Promise<MarketplaceListing | null> {
    return this.listingsCache.get(id) || null
  }

  async getAll(): Promise<MarketplaceListing[]> {
    // Return all listings from all categories
    const allListings: MarketplaceListing[] = []

    for (const templates of Object.values(MOCK_LISTINGS_BY_CATEGORY)) {
      for (const template of templates) {
        allListings.push(this.addVariation(template))
      }
    }

    return allListings
  }
}

// Export singleton instance
// To swap implementations, change this line:
export const marketplaceDatastore: MarketplaceDatastore = new MockMarketplaceDatastore()

// Future implementations might look like:
// export const marketplaceDatastore: MarketplaceDatastore = new ScrapedMarketplaceDatastore()
// export const marketplaceDatastore: MarketplaceDatastore = new BrowserExtensionDatastore()
// export const marketplaceDatastore: MarketplaceDatastore = new AggregatedMarketplaceDatastore([...])
