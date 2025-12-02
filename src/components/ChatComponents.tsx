'use client'

import { useState } from 'react'
import { InteractiveComponent } from '@/lib/conversation-agent'
import {
  DealCard,
  DealCarousel,
  DealComparison,
  NegotiationSuggestions,
  NegotiationThread,
  NegotiationInterface,
  SearchingAnimation,
} from '@/components/DealComponents'

interface ChatComponentsProps {
  components: InteractiveComponent[]
  onSubmit: (values: Record<string, unknown>) => void
  disabled?: boolean
}

export function ChatComponents({ components, onSubmit, disabled }: ChatComponentsProps) {
  const [values, setValues] = useState<Record<string, unknown>>({})

  const updateValue = (id: string, value: unknown) => {
    setValues(prev => ({ ...prev, [id]: value }))
  }

  const handleSubmit = () => {
    onSubmit(values)
  }

  const hasConfirm = components.some(c => c.type === 'confirm')
  const hasRichComponents = components.some(c =>
    ['deal_carousel', 'deal_card', 'deal_comparison', 'negotiation_suggestions', 'negotiation_thread', 'negotiation_interface', 'searching', 'budget_input'].includes(c.type)
  )

  return (
    <div className="space-y-4 mt-3">
      {components.map((component) => (
        <div key={component.id}>
          {component.type === 'text_input' && (
            <div>
              <label className="block text-sm mb-1">{component.label}</label>
              <input
                type="text"
                value={(values[component.id] as string) || ''}
                onChange={(e) => updateValue(component.id, e.target.value)}
                placeholder={component.placeholder}
                className="input"
                disabled={disabled}
              />
            </div>
          )}

          {component.type === 'number_input' && (
            <div>
              <label className="block text-sm mb-1">{component.label}</label>
              <input
                type="number"
                value={(values[component.id] as number) || ''}
                onChange={(e) => updateValue(component.id, e.target.value ? Number(e.target.value) : undefined)}
                placeholder={component.placeholder}
                min={component.min}
                max={component.max}
                className="input"
                disabled={disabled}
              />
            </div>
          )}

          {component.type === 'select' && (
            <div>
              <label className="block text-sm mb-1">{component.label}</label>
              <select
                value={(values[component.id] as string) || ''}
                onChange={(e) => updateValue(component.id, e.target.value)}
                className="input"
                disabled={disabled}
              >
                <option value="">Select...</option>
                {component.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {component.type === 'multi_select' && (
            <div>
              <label className="block text-sm mb-2">{component.label}</label>
              <div className="flex flex-wrap gap-2">
                {component.options.map((opt) => {
                  const selected = ((values[component.id] as string[]) || []).includes(opt.value)
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        const current = (values[component.id] as string[]) || []
                        const updated = selected
                          ? current.filter(v => v !== opt.value)
                          : [...current, opt.value]
                        updateValue(component.id, updated)
                      }}
                      className={`px-3 py-1 text-sm border transition-colors ${
                        selected
                          ? 'bg-black text-white border-black'
                          : 'border-gray-300 hover:border-black'
                      }`}
                      disabled={disabled}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {component.type === 'checkbox' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={(values[component.id] as boolean) || false}
                onChange={(e) => updateValue(component.id, e.target.checked)}
                className="w-4 h-4"
                disabled={disabled}
              />
              <span className="text-sm">{component.label}</span>
            </label>
          )}

          {component.type === 'checkbox_group' && (
            <div>
              <label className="block text-sm mb-2">{component.label}</label>
              <div className="space-y-2">
                {component.options.map((opt) => {
                  const selected = ((values[component.id] as string[]) || []).includes(opt.value)
                  return (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => {
                          const current = (values[component.id] as string[]) || []
                          const updated = selected
                            ? current.filter(v => v !== opt.value)
                            : [...current, opt.value]
                          updateValue(component.id, updated)
                        }}
                        className="w-4 h-4"
                        disabled={disabled}
                      />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {component.type === 'confirm' && (
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  updateValue(component.id, true)
                  onSubmit({ ...values, [component.id]: true })
                }}
                className="flex-1 sm:flex-none px-5 py-3 sm:py-2.5 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-all active:scale-[0.98] disabled:opacity-50"
                disabled={disabled}
              >
                {component.confirmLabel || 'Confirm'}
              </button>
              <button
                type="button"
                onClick={() => {
                  updateValue(component.id, false)
                  onSubmit({ ...values, [component.id]: false })
                }}
                className="flex-1 sm:flex-none px-5 py-3 sm:py-2.5 border border-gray-300 rounded-full text-sm font-medium hover:bg-gray-50 transition-all active:scale-[0.98] disabled:opacity-50"
                disabled={disabled}
              >
                {component.cancelLabel || 'Cancel'}
              </button>
            </div>
          )}

          {component.type === 'budget_input' && (
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex gap-2 items-center">
                <span className="text-gray-500">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="max budget"
                  value={values[component.id] as string || ''}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '')
                    updateValue(component.id, val)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const budget = parseInt(values[component.id] as string)
                      if (budget > 0) {
                        onSubmit({ budget_amount: budget })
                      }
                    }
                  }}
                  className="flex-1 px-4 py-3 sm:py-2.5 border border-gray-300 rounded-full text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  disabled={disabled}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    const budget = parseInt(values[component.id] as string)
                    if (budget > 0) {
                      onSubmit({ budget_amount: budget })
                    }
                  }}
                  className="px-5 py-3 sm:py-2.5 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-all active:scale-[0.98] disabled:opacity-50"
                  disabled={disabled || !values[component.id]}
                >
                  Go
                </button>
              </div>
              <button
                type="button"
                onClick={() => onSubmit({ budget_unknown: true })}
                className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2 py-2"
                disabled={disabled}
              >
                I don't know my budget
              </button>
            </div>
          )}

          {/* Rich deal components */}
          {component.type === 'searching' && (
            <SearchingAnimation query={component.query} />
          )}

          {component.type === 'deal_carousel' && (
            <DealCarousel
              deals={component.deals}
              onSelect={(id) => onSubmit({ selected_deal_id: id })}
              selectedId={values.selected_deal_id as string}
            />
          )}

          {component.type === 'deal_card' && (
            <DealCard
              deal={component.deal}
              compact={false}
            />
          )}

          {component.type === 'deal_comparison' && (
            <DealComparison
              deals={component.deals}
              onSelect={(id) => onSubmit({ selected_deal_id: id })}
            />
          )}

          {component.type === 'negotiation_suggestions' && (
            <NegotiationSuggestions
              suggestions={component.suggestions}
              onSelect={(message) => onSubmit({ sent_message: message })}
              disabled={disabled}
            />
          )}

          {component.type === 'negotiation_thread' && (
            <NegotiationThread
              messages={component.messages}
              onAddSellerMessage={(content) => onSubmit({ seller_response: content })}
              disabled={disabled}
            />
          )}

          {component.type === 'negotiation_interface' && (
            <NegotiationInterface
              deal={component.deal}
              messages={component.messages}
              suggestions={component.suggestions}
              waitingForSeller={component.waitingForSeller}
              onSendMessage={(message) => onSubmit({ sent_message: message })}
              onAddSellerResponse={(response) => onSubmit({ seller_response: response })}
              disabled={disabled}
            />
          )}
        </div>
      ))}

      {!hasConfirm && !hasRichComponents && components.length > 0 && (
        <button
          type="button"
          onClick={handleSubmit}
          className="px-4 py-2 bg-black text-white rounded-full text-sm hover:bg-gray-800 transition-colors"
          disabled={disabled}
        >
          Continue
        </button>
      )}
    </div>
  )
}
