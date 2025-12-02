'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { ChatComponents } from '@/components/ChatComponents'
import { conversation, searches } from '@/lib/api'
import { ConversationMessage, SearchProfile, InteractiveComponent } from '@/lib/conversation-agent'

interface SearchSummary {
  id: string
  name: string
  status: string
  activeDealsCount: number
  highestDealScore: number | null
  statusSummary: string
}

export default function Home() {
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [searchProfile, setSearchProfile] = useState<SearchProfile>({ isComplete: false })
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [stage, setStage] = useState<string>('greeting')
  const [existingSearches, setExistingSearches] = useState<SearchSummary[]>([])
  const [showSearches, setShowSearches] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load existing searches
  useEffect(() => {
    loadSearches()
  }, [])

  // Start conversation on mount
  useEffect(() => {
    if (messages.length === 0) {
      getInitialMessage()
    }
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadSearches = async () => {
    const result = await searches.list()
    if (result.success && result.data) {
      setExistingSearches(result.data as unknown as SearchSummary[])
    }
  }

  const getInitialMessage = () => {
    // Fixed greeting - no API call needed
    const assistantMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: "hey! i'm iris. i help people find stuff on marketplace and negotiate the best price. what are you looking for?",
      components: undefined,
      timestamp: new Date(),
    }
    setMessages([assistantMessage])
    setStage('greeting')
  }

  const sendMessage = async (content: string, componentValues?: Record<string, unknown>) => {
    const userMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      componentValues,
      timestamp: new Date(),
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInputValue('')
    setIsLoading(true)

    const result = await conversation.send(
      newMessages,
      { ...searchProfile, ...componentValues }
    )

    if (result.success && result.data) {
      const updatedProfile = { ...searchProfile, ...result.data.profile_updates } as SearchProfile
      setSearchProfile(updatedProfile)
      setStage(result.data.stage)

      const assistantMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.data.message,
        components: result.data.components as InteractiveComponent[] | undefined,
        timestamp: new Date(),
        // Preserve reasoning_details for multi-turn reasoning model conversations
        reasoning_details: result.data.reasoning_details,
      }
      setMessages([...newMessages, assistantMessage])

      // If stage is "searching", trigger the actual search after a delay for animation
      if (result.data.stage === 'searching') {
        setTimeout(() => triggerDealSearch(updatedProfile, [...newMessages, assistantMessage]), 1500)
        return // Don't set isLoading to false yet
      }

      // If search is ready, create it
      if (result.data.stage === 'ready' && updatedProfile.isComplete) {
        await createSearch(updatedProfile)
      }
    }
    setIsLoading(false)
  }

  const triggerDealSearch = async (profile: SearchProfile, currentMessages: ConversationMessage[]) => {
    const result = await conversation.send(currentMessages, profile as unknown as Record<string, unknown>, { triggerSearch: true })

    if (result.success && result.data) {
      const updatedProfile = { ...profile, ...result.data.profile_updates } as SearchProfile
      setSearchProfile(updatedProfile)
      setStage(result.data.stage)

      const assistantMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.data.message,
        components: result.data.components as InteractiveComponent[] | undefined,
        timestamp: new Date(),
        reasoning_details: result.data.reasoning_details,
      }
      setMessages([...currentMessages, assistantMessage])
    }
    setIsLoading(false)
  }

  const createSearch = async (profile: SearchProfile) => {
    const result = await searches.create({
      name: profile.itemDescription || 'New Search',
      goalText: `Looking for ${profile.itemDescription}`,
      budgetMin: profile.budgetMin,
      budgetMax: profile.budgetMax,
      softPreferences: {
        mustHaves: profile.mustHaves,
        niceToHaves: profile.niceToHaves,
        dealBreakers: profile.dealBreakers,
        urgency: profile.urgency,
        maxDistance: profile.maxDistance,
      },
    })

    if (result.success) {
      loadSearches()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue.trim())
    }
  }

  const handleComponentSubmit = (values: Record<string, unknown>) => {
    const summary = Object.entries(values)
      .filter(([_, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ') || 'Selected options'
    sendMessage(summary, values)
  }

  const startNewSearch = () => {
    setMessages([])
    setSearchProfile({ isComplete: false })
    setStage('greeting')
    setShowSearches(false)
    setTimeout(() => getInitialMessage(), 100)
  }

  // Show searches list view
  if (showSearches) {
    return (
      <div className="min-h-screen bg-white">
        <header className="relative">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-center">
            <span className="text-xl font-bold">iris</span>
            <nav className="absolute right-4 flex items-center gap-3">
              <button onClick={startNewSearch} className="text-sm hover:underline">
                New Search
              </button>
            </nav>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-6">Your Searches</h1>
          <div className="space-y-3">
            {existingSearches.map((search) => (
              <Link
                key={search.id}
                href={`/searches/${search.id}`}
                className="block border border-black p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">{search.name}</h3>
                    <p className="text-sm text-gray-600">{search.statusSummary || 'No deals yet'}</p>
                  </div>
                  <div className="text-right">
                    {search.highestDealScore !== null && (
                      <span
                        className={`score-badge ${
                          search.highestDealScore >= 70
                            ? 'score-high'
                            : search.highestDealScore >= 50
                            ? 'score-medium'
                            : 'score-low'
                        }`}
                      >
                        Best: {search.highestDealScore}
                      </span>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {search.activeDealsCount || 0} deal{search.activeDealsCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
            {existingSearches.length === 0 && (
              <p className="text-gray-500 text-center py-8">No searches yet</p>
            )}
          </div>
        </main>
      </div>
    )
  }

  // Main chat interface - full page
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Minimal header */}
      <header className="relative">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-center">
          <span className="text-xl font-bold">iris</span>
          {existingSearches.length > 0 && (
            <nav className="absolute right-4 sm:right-6 lg:right-8 flex items-center gap-3">
              <button
                onClick={() => setShowSearches(true)}
                className="text-sm hover:underline"
              >
                Searches ({existingSearches.length})
              </button>
            </nav>
          )}
        </div>
      </header>

      {/* Chat area - takes remaining space */}
      <main className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-6 space-y-4">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`message-bubble ${
                  message.role === 'user'
                    ? 'bg-gray-200 text-black px-4 py-2 rounded-3xl max-w-[85%] sm:max-w-[70%] lg:max-w-[60%]'
                    : 'max-w-[85%] sm:max-w-[70%] lg:max-w-[60%]'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>

                {/* Interactive components for the last assistant message */}
                {message.role === 'assistant' &&
                  message.components &&
                  message.components.length > 0 &&
                  index === messages.length - 1 && (
                    <ChatComponents
                      components={message.components}
                      onSubmit={handleComponentSubmit}
                      disabled={isLoading}
                    />
                  )}
              </div>
            </div>
          ))}

          {isLoading && stage !== 'searching' && stage !== 'deal_selected' && stage !== 'negotiating' && (
            <div className="flex justify-start">
              <div className="max-w-[85%]">
                <p className="text-gray-400 animate-pulse">
                  thinking
                  <span className="inline-flex ml-0.5">
                    <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                  </span>
                </p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area - fixed at bottom */}
        <div className="pb-8 sm:pb-12">
          {stage === 'ready' && searchProfile.isComplete ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={startNewSearch} className="btn flex-1 rounded-full py-3 sm:py-2">
                Start Another Search
              </button>
              <button
                onClick={() => setShowSearches(true)}
                className="btn btn-primary flex-1 rounded-full py-3 sm:py-2"
              >
                View Searches
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex items-center gap-2 sm:gap-3 bg-white border border-gray-200 rounded-full pl-4 sm:pl-6 pr-2 sm:pr-3 py-1.5 sm:py-2 shadow-lg">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Talk to iris"
                className="flex-1 min-w-0 bg-transparent py-2 text-base focus:outline-none"
                disabled={isLoading}
                autoFocus
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="flex-shrink-0 w-10 h-10 rounded-full bg-black text-white flex items-center justify-center disabled:opacity-30 transition-opacity"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
