'use client'

import { useState } from 'react'
import { WidgetProps } from './WidgetRegistry'

export default function TaritiGPTPrompt({ settings }: WidgetProps) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!prompt.trim()) return

    setLoading(true)
    setResponse(null)

    try {
      // TODO: Integrate with TaritiGPT API
      // For now, this is a placeholder
      const res = await fetch('/api/tariti-gpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      if (!res.ok) throw new Error('Failed to get response')
      
      const data = await res.json()
      setResponse(data.response || 'No response')
    } catch (error) {
      console.error('Error calling TaritiGPT:', error)
      setResponse('Error: Could not get response from TaritiGPT')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">TaritiGPT</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask TaritiGPT anything..."
          className="w-full p-3 border rounded-lg resize-none"
          rows={4}
        />
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </form>

      {response && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{response}</p>
        </div>
      )}
    </div>
  )
}

