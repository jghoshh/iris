// Client-side API helper

const API_BASE = '/api'

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  const data = await response.json()
  return data
}

// Conversation (for search setup)
export const conversation = {
  send: (messages: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    components?: unknown[]
    componentValues?: Record<string, unknown>
    timestamp: Date
    reasoning_details?: unknown[]
  }>, searchProfile: Record<string, unknown>, options?: { triggerSearch?: boolean }) =>
    fetchApi<{
      message: string
      components?: unknown[]
      profile_updates: Record<string, unknown>
      stage: string
      reasoning_details?: unknown[]
    }>('/conversation', {
      method: 'POST',
      body: JSON.stringify({ messages, searchProfile, triggerSearch: options?.triggerSearch }),
    }),
}
