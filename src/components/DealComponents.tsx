'use client'

import { useState, useRef, useEffect } from 'react'

// Extended component types for rich deal displays
export interface DealCardData {
  id: string
  title: string
  price: number
  description: string
  imageUrl: string
  marketplace: string
  location: string
  distanceKm: number
  postedDaysAgo: number
  sellerName: string
  sellerRating: number | null
  condition: string
  dealScore: number
  priceScore: number
  riskScore: number
  attributes: Record<string, string | number | boolean>
}

export interface NegotiationMessage {
  id: string
  role: 'buyer' | 'seller' | 'suggestion'
  content: string
  timestamp?: Date
}

// Score badge component
function ScoreBadge({ score, label, size = 'sm' }: { score: number; label?: string; size?: 'sm' | 'lg' }) {
  const color = score >= 70 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                score >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                'bg-red-50 text-red-700 border-red-200'

  const sizeClasses = size === 'lg'
    ? 'px-2.5 py-1 text-sm font-semibold'
    : 'px-2 py-0.5 text-xs font-medium'

  return (
    <span className={`inline-flex items-center rounded-full border ${color} ${sizeClasses}`}>
      {label && <span className="mr-1 opacity-70">{label}</span>}
      {score}
    </span>
  )
}

// Individual deal card
export function DealCard({
  deal,
  onSelect,
  isSelected,
  compact = false,
}: {
  deal: DealCardData
  onSelect?: (id: string) => void
  isSelected?: boolean
  compact?: boolean
}) {
  const marketplaceColors: Record<string, string> = {
    facebook: 'bg-blue-100 text-blue-800',
    craigslist: 'bg-purple-100 text-purple-800',
    offerup: 'bg-green-100 text-green-800',
    other: 'bg-gray-100 text-gray-800',
  }

  const conditionLabels: Record<string, string> = {
    new: 'New',
    like_new: 'Like New',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
  }

  if (compact) {
    return (
      <div
        className={`border rounded-xl p-3 cursor-pointer transition-all ${
          isSelected ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-400'
        }`}
        onClick={() => onSelect?.(deal.id)}
      >
        <div className="flex items-start gap-3">
          <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center text-gray-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-sm truncate">{deal.title}</h4>
              <ScoreBadge score={deal.dealScore} />
            </div>
            <p className="text-lg font-bold">${deal.price}</p>
            <p className="text-xs text-gray-500">{deal.location} · {deal.distanceKm}km</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all bg-white ${
      isSelected ? 'border-black ring-1 ring-black' : 'border-gray-200 hover:border-gray-300'
    }`}>
      {/* Image placeholder with gradient */}
      <div className="h-36 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 flex items-center justify-center text-gray-300 relative">
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {/* New badge */}
        {deal.postedDaysAgo <= 2 && (
          <div className="absolute top-3 left-3">
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-black text-white">
              New
            </span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-2.5">
        {/* Price and title */}
        <div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-xl font-bold">${deal.price}</h3>
            <span className="text-xs text-gray-400">{deal.postedDaysAgo}d ago</span>
          </div>
          <p className="text-sm text-gray-600 line-clamp-1 mt-0.5">{deal.title}</p>
        </div>

        {/* Quick info row */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className={`px-2 py-0.5 rounded-full ${marketplaceColors[deal.marketplace] || marketplaceColors.other}`}>
            {deal.marketplace}
          </span>
          <span>{conditionLabels[deal.condition] || deal.condition}</span>
          <span>·</span>
          <span>{deal.distanceKm}km</span>
        </div>

        {/* Seller */}
        <div className="flex items-center gap-1.5 text-sm">
          <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-medium text-gray-600">
            {deal.sellerName.charAt(0).toUpperCase()}
          </div>
          <span className="text-gray-700">{deal.sellerName}</span>
          {deal.sellerRating && (
            <span className="flex items-center gap-0.5 text-gray-500">
              <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {deal.sellerRating}
            </span>
          )}
        </div>

        {/* Actions */}
        {onSelect && (
          <button
            onClick={() => onSelect(deal.id)}
            className={`w-full py-2.5 rounded-full text-sm font-medium transition-colors ${
              isSelected
                ? 'bg-gray-100 text-gray-500'
                : 'bg-black text-white hover:bg-gray-800'
            }`}
          >
            {isSelected ? 'Selected' : 'Select'}
          </button>
        )}
      </div>
    </div>
  )
}

// Expanded deal modal
export function DealExpanded({
  deal,
  onClose,
  onSelect,
}: {
  deal: DealCardData
  onClose: () => void
  onSelect?: (id: string) => void
}) {
  const marketplaceColors: Record<string, string> = {
    facebook: 'bg-blue-100 text-blue-800',
    craigslist: 'bg-purple-100 text-purple-800',
    offerup: 'bg-green-100 text-green-800',
    other: 'bg-gray-100 text-gray-800',
  }

  const conditionLabels: Record<string, string> = {
    new: 'New',
    like_new: 'Like New',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center hover:bg-white"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image */}
        <div className="h-56 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 flex items-center justify-center text-gray-300">
          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>

        <div className="p-5 space-y-4">
          {/* Price and title */}
          <div>
            <h2 className="text-2xl font-bold">${deal.price}</h2>
            <p className="text-gray-700 mt-1">{deal.title}</p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            <span className={`px-3 py-1 rounded-full text-sm ${marketplaceColors[deal.marketplace] || marketplaceColors.other}`}>
              {deal.marketplace}
            </span>
            <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
              {conditionLabels[deal.condition] || deal.condition}
            </span>
            <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
              {deal.distanceKm}km away
            </span>
            <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
              {deal.postedDaysAgo}d ago
            </span>
          </div>

          {/* Description */}
          {deal.description && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
              <p className="text-sm text-gray-700">{deal.description}</p>
            </div>
          )}

          {/* Seller */}
          <div className="flex items-center gap-3 py-3 border-t border-gray-100">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
              {deal.sellerName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium">{deal.sellerName}</p>
              {deal.sellerRating ? (
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {deal.sellerRating} rating
                </p>
              ) : (
                <p className="text-sm text-gray-400">No ratings yet</p>
              )}
            </div>
          </div>

          {/* Action */}
          {onSelect && (
            <button
              onClick={() => {
                onSelect(deal.id)
                onClose()
              }}
              className="w-full py-3 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-colors"
            >
              Select this deal
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Horizontal carousel for deals
export function DealCarousel({
  deals,
  onSelect,
  selectedId,
}: {
  deals: DealCardData[]
  onSelect?: (id: string) => void
  selectedId?: string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [expandedDeal, setExpandedDeal] = useState<DealCardData | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = 280
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -amount : amount,
        behavior: 'smooth',
      })
      setCurrentIndex(prev => {
        if (direction === 'left') return Math.max(0, prev - 1)
        return Math.min(deals.length - 1, prev + 1)
      })
    }
  }

  if (deals.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No deals found matching your criteria
      </div>
    )
  }

  return (
    <>
      <div className="relative">
        {/* Scrollable container */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide py-1 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {deals.map((deal) => (
            <div key={deal.id} className="flex-shrink-0 w-[72vw] sm:w-64 snap-start">
              <div
                className={`border rounded-2xl overflow-hidden transition-all bg-white cursor-pointer ${
                  selectedId === deal.id ? 'border-black ring-1 ring-black' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setExpandedDeal(deal)}
              >
                {/* Image placeholder */}
                <div className="h-32 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 flex items-center justify-center text-gray-300 relative">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {deal.postedDaysAgo <= 2 && (
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-black text-white">
                        New
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-3 space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-lg font-bold">${deal.price}</h3>
                    <span className="text-[10px] text-gray-400">{deal.postedDaysAgo}d</span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-1">{deal.title}</p>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500">
                    <span>{deal.marketplace}</span>
                    <span>·</span>
                    <span>{deal.distanceKm}km</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation arrows - positioned outside cards */}
        {deals.length > 1 && (
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={() => scroll('left')}
              disabled={currentIndex === 0}
              className="w-8 h-8 border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Dots */}
            <div className="flex gap-1.5">
              {deals.map((deal, i) => (
                <div
                  key={deal.id}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === currentIndex ? 'bg-black' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => scroll('right')}
              disabled={currentIndex === deals.length - 1}
              className="w-8 h-8 border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Expanded view modal */}
      {expandedDeal && (
        <DealExpanded
          deal={expandedDeal}
          onClose={() => setExpandedDeal(null)}
          onSelect={onSelect}
        />
      )}
    </>
  )
}

// Negotiation message suggestions
export function NegotiationSuggestions({
  suggestions,
  onSelect,
  disabled,
}: {
  suggestions: { id: string; label: string; message: string; style: 'friendly' | 'direct' | 'firm' }[]
  onSelect: (message: string) => void
  disabled?: boolean
}) {
  const styleConfig = {
    friendly: {
      bg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
      icon: '👋',
      label: 'Friendly'
    },
    direct: {
      bg: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
      icon: '💬',
      label: 'Direct'
    },
    firm: {
      bg: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
      icon: '💪',
      label: 'Firm'
    },
  }

  return (
    <div className="space-y-2">
      {suggestions.map((suggestion) => {
        const config = styleConfig[suggestion.style]
        return (
          <button
            key={suggestion.id}
            onClick={() => onSelect(suggestion.message)}
            disabled={disabled}
            className={`w-full text-left p-3 border rounded-xl transition-all active:scale-[0.98] ${config.bg} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm">{config.icon}</span>
              <span className="text-xs font-medium text-gray-600">{config.label}</span>
              <span className="text-xs text-gray-400">· {suggestion.label}</span>
            </div>
            <p className="text-sm text-gray-800 leading-relaxed">{suggestion.message}</p>
          </button>
        )
      })}
    </div>
  )
}

// Conversation thread display for negotiation coaching
export function NegotiationThread({
  messages,
  onAddSellerMessage,
  onGetSuggestion,
  disabled,
}: {
  messages: NegotiationMessage[]
  onAddSellerMessage?: (content: string) => void
  onGetSuggestion?: () => void
  disabled?: boolean
}) {
  const [sellerInput, setSellerInput] = useState('')

  const handleAddSeller = () => {
    if (sellerInput.trim() && onAddSellerMessage) {
      onAddSellerMessage(sellerInput.trim())
      setSellerInput('')
    }
  }

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
      {/* Thread header */}
      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
        <span className="text-sm">💬</span>
        <span className="text-xs font-medium text-gray-600">Conversation</span>
      </div>

      {/* Messages */}
      <div className="p-4 space-y-3 max-h-56 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            Messages will appear here
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.role === 'buyer' ? 'justify-end' :
                msg.role === 'suggestion' ? 'justify-center' : 'justify-start'
              }`}
            >
              {msg.role === 'suggestion' ? (
                <div className="bg-violet-50 border border-violet-100 rounded-xl px-3 py-2 max-w-[90%]">
                  <p className="text-xs text-violet-600 font-medium mb-1">Iris suggests</p>
                  <p className="text-sm text-violet-900">{msg.content}</p>
                </div>
              ) : (
                <div
                  className={`rounded-2xl px-3.5 py-2 max-w-[80%] ${
                    msg.role === 'buyer'
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className={`text-[7px] font-medium tracking-wide mb-0.5 ${
                    msg.role === 'buyer' ? 'text-white/40' : 'text-gray-400'
                  }`}>
                    {msg.role === 'buyer' ? 'You' : 'Seller'}
                  </p>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input for seller response */}
      {onAddSellerMessage && (
        <div className="border-t border-gray-100 p-3 bg-gray-50">
          <p className="text-xs text-gray-500 mb-2">Paste the seller's reply:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={sellerInput}
              onChange={(e) => setSellerInput(e.target.value)}
              placeholder="What did they say?"
              className="flex-1 min-w-0 px-4 py-3 sm:py-2 bg-white border border-gray-200 rounded-full text-base sm:text-sm focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all"
              disabled={disabled}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSeller()}
            />
            <button
              onClick={handleAddSeller}
              disabled={disabled || !sellerInput.trim()}
              className="flex-shrink-0 px-4 py-3 sm:py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Get suggestion button */}
      {onGetSuggestion && (
        <div className="border-t border-gray-100 p-3">
          <button
            onClick={onGetSuggestion}
            disabled={disabled}
            className="w-full px-4 py-2.5 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Get next message
          </button>
        </div>
      )}
    </div>
  )
}

// Deal comparison view
export function DealComparison({
  deals,
  onSelect,
}: {
  deals: DealCardData[]
  onSelect?: (id: string) => void
}) {
  if (deals.length < 2) return null

  const bestDeal = deals.reduce((best, deal) =>
    deal.dealScore > best.dealScore ? deal : best
  )

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <span className="text-xs font-medium text-gray-600">Quick Comparison</span>
      </div>

      <div className="p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="pb-2 font-medium">Listing</th>
              <th className="pb-2 font-medium text-right">Price</th>
              <th className="pb-2 font-medium text-right">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {deals.map((deal) => (
              <tr
                key={deal.id}
                onClick={() => onSelect?.(deal.id)}
                className={`cursor-pointer hover:bg-gray-50 ${
                  deal.id === bestDeal.id ? 'bg-green-50' : ''
                }`}
              >
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    {deal.id === bestDeal.id && (
                      <span className="text-xs text-green-600 font-medium">Best</span>
                    )}
                    <span className="truncate max-w-[150px]">{deal.title}</span>
                  </div>
                </td>
                <td className="py-2 text-right font-medium">${deal.price}</td>
                <td className="py-2 text-right">
                  <ScoreBadge score={deal.dealScore} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Loading state for when Iris is "searching"
export function SearchingAnimation({ query }: { query: string }) {
  return (
    <div className="flex items-center gap-3 py-3 px-4 bg-gray-50 rounded-xl border border-gray-100">
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-sm text-gray-500">Searching for {query}...</span>
    </div>
  )
}

// API call to generate seller response using AI
async function generateSellerResponse(
  deal: DealCardData,
  conversationHistory: NegotiationMessage[],
  buyerMessage: string
): Promise<string> {
  try {
    const response = await fetch('/api/simulate-seller', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deal: {
          title: deal.title,
          price: deal.price,
          condition: deal.condition,
          sellerName: deal.sellerName,
        },
        conversationHistory: conversationHistory.map(m => ({
          role: m.role,
          content: m.content,
        })),
        buyerMessage,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to generate seller response')
    }

    const data = await response.json()
    return data.response || "Yes, it's still available!"
  } catch (error) {
    console.error('Error generating seller response:', error)
    // Fallback responses if API fails
    const fallbacks = [
      "Yes it's still available!",
      "Yeah I can do that, when can you pick up?",
      "Sounds good, let me know!",
    ]
    return fallbacks[Math.floor(Math.random() * fallbacks.length)]
  }
}

// Generate contextual suggestions based on seller's last message
function generateSuggestionsForSellerMessage(
  sellerMessage: string,
  dealPrice: number
): { id: string; label: string; message: string; style: 'friendly' | 'direct' | 'firm' }[] {
  const lowerMessage = sellerMessage.toLowerCase()
  const targetPrice = Math.round(dealPrice * 0.8)
  const midPrice = Math.round(dealPrice * 0.85)

  // Check for availability confirmation
  if (lowerMessage.includes('available') || lowerMessage.includes('yes')) {
    return [
      { id: 'make-offer', label: 'Make an offer', message: `Great! Would you consider $${targetPrice}?`, style: 'friendly' },
      { id: 'ask-condition', label: 'Ask about condition', message: `Awesome! Any scratches or issues I should know about?`, style: 'direct' },
      { id: 'strong-offer', label: 'Strong offer', message: `Perfect! I can do $${targetPrice} cash and pick up today`, style: 'firm' },
    ]
  }

  // Check for counter-offer or price negotiation
  if (lowerMessage.includes('higher') || lowerMessage.includes('middle') || lowerMessage.includes('best offer')) {
    return [
      { id: 'meet-middle', label: 'Meet in middle', message: `How about $${midPrice}? That's the best I can do`, style: 'friendly' },
      { id: 'hold-firm', label: 'Hold firm', message: `I appreciate it, but $${targetPrice} is really my max`, style: 'direct' },
      { id: 'walk-away', label: 'Walk away', message: `Thanks for your time, but I'll have to pass. Good luck!`, style: 'firm' },
    ]
  }

  // Check for pickup/scheduling
  if (lowerMessage.includes('pick up') || lowerMessage.includes('when') || lowerMessage.includes('weekend') || lowerMessage.includes('today') || lowerMessage.includes('free')) {
    return [
      { id: 'flexible', label: 'Be flexible', message: `I'm flexible! What time works best for you?`, style: 'friendly' },
      { id: 'suggest-time', label: 'Suggest time', message: `How about tomorrow afternoon around 2pm?`, style: 'direct' },
      { id: 'today', label: 'Go today', message: `I can come in the next hour if that works!`, style: 'firm' },
    ]
  }

  // Check for agreement
  if (lowerMessage.includes('works') || lowerMessage.includes('deal') || lowerMessage.includes('sure') || lowerMessage.includes('sounds good')) {
    return [
      { id: 'confirm', label: 'Confirm details', message: `Perfect! Can you send me your address?`, style: 'friendly' },
      { id: 'verify', label: 'Verify item', message: `Great! Can you send a couple more photos before I head over?`, style: 'direct' },
    ]
  }

  // Default suggestions
  return [
    { id: 'friendly-reply', label: 'Friendly reply', message: `Thanks for getting back! Let me know what works for you`, style: 'friendly' },
    { id: 'direct-reply', label: 'Direct reply', message: `Sounds good. What's the next step?`, style: 'direct' },
  ]
}

// Integrated negotiation interface - combines thread, suggestions, and custom input
// This component is SELF-CONTAINED - it manages its own state and simulates seller responses
export function NegotiationInterface({
  deal,
  messages: initialMessages,
  suggestions: initialSuggestions,
  waitingForSeller: _initialWaiting,
  onSendMessage: _onSendMessage,
  onAddSellerResponse: _onAddSellerResponse,
  onStartNewSearch,
  disabled,
}: {
  deal: DealCardData
  messages: NegotiationMessage[]
  suggestions?: { id: string; label: string; message: string; style: 'friendly' | 'direct' | 'firm' }[]
  waitingForSeller?: boolean
  onSendMessage: (message: string) => void
  onAddSellerResponse?: (response: string) => void  // Optional - not used since component is self-contained
  onStartNewSearch?: () => void  // Callback to end conversation and start fresh
  disabled?: boolean
}) {
  // Internal state - this component manages the conversation locally
  const [localMessages, setLocalMessages] = useState<NegotiationMessage[]>(initialMessages)
  const [currentSuggestions, setCurrentSuggestions] = useState(initialSuggestions)
  const [isWaitingForSeller, setIsWaitingForSeller] = useState(false)
  const [customMessage, setCustomMessage] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Sync with props when they change (for initial load)
  useEffect(() => {
    if (initialMessages.length > localMessages.length) {
      setLocalMessages(initialMessages)
    }
  }, [initialMessages, localMessages.length])

  useEffect(() => {
    if (initialSuggestions && initialSuggestions.length > 0) {
      setCurrentSuggestions(initialSuggestions)
    }
  }, [initialSuggestions])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [localMessages])

  // Simulate seller response after buyer sends a message using AI
  const simulateSellerResponse = async (buyerMessage: string) => {
    // Random delay between 1-3 seconds to simulate typing
    const delay = 1000 + Math.random() * 2000

    await new Promise(resolve => setTimeout(resolve, delay))

    // Use AI to generate contextual seller response
    const response = await generateSellerResponse(deal, localMessages, buyerMessage)

    const sellerMessage: NegotiationMessage = {
      id: `seller-${Date.now()}`,
      role: 'seller',
      content: response,
      timestamp: new Date()
    }

    setLocalMessages(prev => [...prev, sellerMessage])
    setIsWaitingForSeller(false)

    // Generate new suggestions based on seller's response
    const newSuggestions = generateSuggestionsForSellerMessage(response, deal.price)
    setCurrentSuggestions(newSuggestions)

    // NOTE: We intentionally do NOT call onAddSellerResponse here
    // The NegotiationInterface is self-contained and manages its own state
    // Calling the parent would trigger another AI call and create duplicate UI
  }

  const handleSendMessage = (message: string) => {
    // Add buyer message locally
    const buyerMessage: NegotiationMessage = {
      id: `buyer-${Date.now()}`,
      role: 'buyer',
      content: message,
      timestamp: new Date()
    }

    setLocalMessages(prev => [...prev, buyerMessage])
    setCurrentSuggestions(undefined)
    setIsWaitingForSeller(true)
    setShowCustomInput(false)
    setCustomMessage('')

    // NOTE: We do NOT call onSendMessage here anymore
    // The NegotiationInterface is self-contained and calling the parent
    // would trigger an AI call that re-renders the component and resets state

    // Simulate seller response
    simulateSellerResponse(message)
  }

  const handleSendCustom = () => {
    if (customMessage.trim()) {
      handleSendMessage(customMessage.trim())
    }
  }

  const styleConfig = {
    friendly: {
      bg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
      icon: '👋',
      label: 'Friendly'
    },
    direct: {
      bg: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
      icon: '💬',
      label: 'Direct'
    },
    firm: {
      bg: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
      icon: '💪',
      label: 'Firm'
    },
  }

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
      {/* Deal mini header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-sm line-clamp-1">{deal.title}</p>
              <p className="text-xs text-gray-500">{deal.marketplace} · ${deal.price}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{deal.sellerName}</p>
          </div>
        </div>
      </div>

      {/* Messages thread - only show if there are messages */}
      {localMessages.length > 0 && (
        <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
          {localMessages.map((msg: NegotiationMessage) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'buyer' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`rounded-2xl px-3.5 py-2 max-w-[80%] ${
                  msg.role === 'buyer'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className={`text-[10px] font-medium tracking-wide mb-0.5 uppercase ${
                  msg.role === 'buyer' ? 'text-white/50' : 'text-gray-400'
                }`}>
                  {msg.role === 'buyer' ? 'You' : 'Seller'}
                </p>
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Suggestions OR waiting state OR custom input */}
      <div className="border-t border-gray-100">
        {isWaitingForSeller ? (
          // Waiting for seller response - show waiting animation
          <div className="p-4">
            <div className="flex items-center gap-2 text-gray-500">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs">{deal.sellerName} is typing...</span>
            </div>
          </div>
        ) : currentSuggestions && currentSuggestions.length > 0 ? (
          // Show suggestions + custom option
          <div className="p-4 space-y-3">
            <p className="text-xs text-gray-500">Choose a response or write your own:</p>

            {/* Quick suggestions as pills */}
            <div className="space-y-2">
              {currentSuggestions.map((suggestion: { id: string; label: string; message: string; style: 'friendly' | 'direct' | 'firm' }) => {
                const config = styleConfig[suggestion.style]
                return (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSendMessage(suggestion.message)}
                    disabled={disabled}
                    className={`w-full text-left p-3 border rounded-xl transition-all active:scale-[0.99] ${config.bg} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{config.icon}</span>
                      <span className="text-xs font-medium text-gray-600">{config.label}</span>
                      <span className="text-xs text-gray-400">· {suggestion.label}</span>
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed">{suggestion.message}</p>
                  </button>
                )
              })}
            </div>

            {/* Custom message toggle/input */}
            {showCustomInput ? (
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 min-w-0 px-4 py-3 sm:py-2.5 bg-gray-50 border border-gray-200 rounded-full text-base sm:text-sm focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:bg-white transition-all"
                  disabled={disabled}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendCustom()}
                  autoFocus
                />
                <button
                  onClick={handleSendCustom}
                  disabled={disabled || !customMessage.trim()}
                  className="flex-shrink-0 w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => setShowCustomInput(false)}
                  className="flex-shrink-0 w-10 h-10 border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCustomInput(true)}
                className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-700 border border-dashed border-gray-200 rounded-xl hover:border-gray-300 transition-all"
                disabled={disabled}
              >
                Or type your own message...
              </button>
            )}
          </div>
        ) : (
          // No suggestions yet - just show custom input
          <div className="p-4">
            <p className="text-xs text-gray-500 mb-2">Send a message:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 min-w-0 px-4 py-3 sm:py-2.5 bg-gray-50 border border-gray-200 rounded-full text-base sm:text-sm focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:bg-white transition-all"
                disabled={disabled}
                onKeyDown={(e) => e.key === 'Enter' && handleSendCustom()}
              />
              <button
                onClick={handleSendCustom}
                disabled={disabled || !customMessage.trim()}
                className="flex-shrink-0 w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Start new search button */}
      {onStartNewSearch && (
        <div className="border-t border-gray-100 p-3">
          <button
            onClick={onStartNewSearch}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Start new search
          </button>
        </div>
      )}
    </div>
  )
}
