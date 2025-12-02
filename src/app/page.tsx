'use client'

import { useEffect, useState, useRef } from 'react'
import { ChatComponents } from '@/components/ChatComponents'
import { conversation } from '@/lib/api'
import { ConversationMessage, SearchProfile, InteractiveComponent } from '@/lib/conversation-agent'

export default function Home() {
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [searchProfile, setSearchProfile] = useState<SearchProfile>({ isComplete: false })
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [stage, setStage] = useState<string>('greeting')
  const messagesEndRef = useRef<HTMLDivElement>(null)

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

  const getInitialMessage = () => {
    const assistantMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: "hey! i'm iris - i help you find deals and negotiate prices on marketplace. try asking for an iphone, macbook, ps5, airpods, or something else!",
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
        reasoning_details: result.data.reasoning_details,
      }
      setMessages([...newMessages, assistantMessage])

      // If stage is "searching", trigger the actual search after a delay for animation
      if (result.data.stage === 'searching') {
        setTimeout(() => triggerDealSearch(updatedProfile, [...newMessages, assistantMessage]), 1500)
        return
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
    setTimeout(() => getInitialMessage(), 100)
  }

  return (
    <div className="h-screen-safe bg-white flex flex-col overflow-hidden">
      {/* Minimal header - compact */}
      <header className="flex-shrink-0 safe-top bg-white">
        <div className="max-w-3xl mx-auto px-4 py-2 flex items-center justify-center">
          <span className="text-lg font-bold">iris</span>
        </div>
      </header>

      {/* Chat area - takes remaining space, scrollable */}
      <main className="flex-1 min-h-0 flex flex-col max-w-3xl w-full mx-auto px-4">
        {/* Messages - scrollable area */}
        <div className="flex-1 min-h-0 overflow-y-auto py-2 space-y-3">
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

        {/* Input area - fixed at bottom with safe area padding */}
        <div className="flex-shrink-0 pt-2 safe-bottom-padded">
          {stage === 'ready' && searchProfile.isComplete ? (
            <div className="flex gap-2">
              <button onClick={startNewSearch} className="btn btn-primary flex-1 rounded-full py-2.5">
                Start New Search
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-white border border-gray-200 rounded-full pl-4 pr-1.5 py-1 shadow-lg">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Talk to iris"
                className="flex-1 min-w-0 bg-transparent py-1.5 text-base focus:outline-none"
                disabled={isLoading}
                autoFocus
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="flex-shrink-0 w-9 h-9 rounded-full bg-black text-white flex items-center justify-center disabled:opacity-30 transition-opacity"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
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
