import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDeveloper } from '@/contexts/DeveloperContext'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { UIMessage, UIBlock, ToolCallBlock, ApiMessage, SSEEvent } from '@/components/chat/types'
import { apiMessagesToUIMessages } from '@/lib/chat/apiMessagesToUI'
import { getToken, apiUrl } from '@/lib/api'

type ChatSummary = { id: string; title: string; updated_at: string }

const INITIAL_MESSAGE: UIMessage = {
  id: 'intro',
  role: 'assistant',
  blocks: [{
    type: 'text',
    text: "Hey, I'm **Tariti** — your operations AI for Sudic.\n\nI have full access to your dashboard, leads, analytics, AmoCRM, and Moizvonki. Ask me to analyze data, create pages, update leads, or anything else. I'll always ask before making changes.",
  }],
  timestamp: new Date(),
}

/** Show a friendly message for known API errors (e.g. overloaded, rate limit). */
function normalizeErrorMessage(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower.includes('overloaded')) return "Claude's servers are busy right now. Please try again in a moment."
  if (lower.includes('rate_limit') || lower.includes('rate limit')) return "Rate limit reached. Please wait a moment before trying again."
  try {
    const parsed = JSON.parse(raw) as { error?: { type?: string; message?: string }; message?: string }
    const type = parsed?.error?.type
    const msg = parsed?.error?.message ?? parsed?.message
    if (type === 'overloaded_error' || (msg && String(msg).toLowerCase().includes('overloaded'))) {
      return "Claude's servers are busy right now. Please try again in a moment."
    }
    if (type === 'rate_limit_error') return "Rate limit reached. Please wait a moment before trying again."
    if (msg && typeof msg === 'string') return msg
  } catch {
    /* not JSON */
  }
  return raw
}

const SUGGESTIONS = [
  { icon: '📊', text: "Show me today's new leads" },
  { icon: '📞', text: 'Give me an overview of call analytics this week' },
  { icon: '✨', text: 'Create a leads dashboard page with analytics widgets' },
  { icon: '🌐', text: 'Search for real estate market trends in Moldova' },
  { icon: '📄', text: 'What pages does the dashboard currently have?' },
]

async function getAuthToken(): Promise<string> {
  return (await getToken()) ?? ''
}

async function* parseSSE(body: ReadableStream<Uint8Array>): AsyncGenerator<SSEEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const raw = line.slice(6).trim()
          if (!raw) continue
          try {
            yield JSON.parse(raw) as SSEEvent
          } catch {
            // skip malformed
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export default function TaritiGPTPage({ shared = false }: { shared?: boolean }) {
  const { chatId: routeChatId, token: sharedToken } = useParams<{ chatId?: string; token?: string }>()
  const navigate = useNavigate()
  const [chats, setChats] = useState<ChatSummary[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(routeChatId ?? null)
  const [loadingChat, setLoadingChat] = useState(false)
  const [uiMessages, setUiMessages] = useState<UIMessage[]>([INITIAL_MESSAGE])
  const [apiMessages, setApiMessages] = useState<ApiMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [hoveredChat, setHoveredChat] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const isNearBottomRef = useRef(true)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // When sendMessage creates a new chat and navigates, we don't want the
  // routeChatId effect to reload (and wipe) the in-progress conversation.
  const justCreatedChatRef = useRef<string | null>(null)
  const developer = useDeveloper()

  useEffect(() => {
    setCurrentChatId(routeChatId ?? null)
  }, [routeChatId])

  function showToast(msg: string) {
    setToast(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 3000)
  }

  async function fetchChats() {
    if (shared) return
    try {
      const token = await getAuthToken()
      const res = await fetch(apiUrl('/api/ai/chats'), { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      const { chats: list } = await res.json()
      setChats(list ?? [])
    } catch {
      setChats([])
    }
  }

  async function deleteChat(chatId: string) {
    try {
      const token = await getAuthToken()
      await fetch(apiUrl(`/api/ai/chats/${chatId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setChats(prev => prev.filter(c => c.id !== chatId))
      if (currentChatId === chatId) {
        handleReset()
      }
    } catch {
      showToast('Failed to delete chat')
    }
  }

  // Always load the chat list on mount (so sidebar is populated even when
  // opening a specific chat URL directly or after navigation).
  useEffect(() => {
    if (!shared) fetchChats()
  }, [])

  // Load the specific chat when the URL changes.
  useEffect(() => {
    if (shared && sharedToken) {
      setLoadingChat(true)
      fetch(apiUrl(`/api/ai/chats/shared/${sharedToken}`))
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.chat?.messages?.length) {
            const ui = apiMessagesToUIMessages(data.chat.messages as ApiMessage[])
            setUiMessages(ui.length ? ui : [INITIAL_MESSAGE])
            setApiMessages(data.chat.messages)
          }
        })
        .finally(() => setLoadingChat(false))
      return
    }

    if (routeChatId) {
      // If we just created this chat in this session, the messages are already
      // in state — don't reload and wipe the in-progress UI.
      if (justCreatedChatRef.current === routeChatId) {
        justCreatedChatRef.current = null
        return
      }

      setLoadingChat(true)
      getAuthToken().then(token =>
        fetch(apiUrl(`/api/ai/chats/${routeChatId}`), { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data?.chat?.messages?.length) {
              const ui = apiMessagesToUIMessages(data.chat.messages as ApiMessage[])
              setUiMessages(ui.length ? ui : [INITIAL_MESSAGE])
              setApiMessages(data.chat.messages)
              setCurrentChatId(data.chat.id)
            } else {
              setUiMessages([INITIAL_MESSAGE])
              setApiMessages([])
            }
          })
          .finally(() => setLoadingChat(false)),
      )
      return
    }

    // /tariti-gpt with no chat selected — reset to empty state
    setUiMessages([INITIAL_MESSAGE])
    setApiMessages([])
  }, [routeChatId, shared, sharedToken])

  // Track if user is near bottom so we only auto-scroll when appropriate
  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100
  }

  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [uiMessages])

  // Auto-resize textarea
  function adjustTextarea() {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
  }

  function startAssistantMessage(): string {
    const id = crypto.randomUUID()
    const newMsg: UIMessage = {
      id,
      role: 'assistant',
      blocks: [],
      timestamp: new Date(),
      isStreaming: true,
    }
    setUiMessages(prev => [...prev, newMsg])
    isNearBottomRef.current = true
    return id
  }

  function updateAssistantMessage(
    msgId: string,
    updater: (blocks: UIBlock[]) => UIBlock[],
    streaming = true,
  ) {
    setUiMessages(prev =>
      prev.map(m =>
        m.id === msgId
          ? { ...m, blocks: updater(m.blocks), isStreaming: streaming }
          : m,
      ),
    )
  }

  const streamFromResponse = useCallback(
    async (response: Response, msgId: string): Promise<ApiMessage[]> => {
      if (!response.body) throw new Error('No response body')

      let updatedMessages: ApiMessage[] = []

      for await (const event of parseSSE(response.body)) {
        developer?.devLog('SSE', event.type, event)
        switch (event.type) {
          case 'text_delta': {
            updateAssistantMessage(msgId, blocks => {
              const last = blocks[blocks.length - 1]
              if (last?.type === 'text') {
                return [...blocks.slice(0, -1), { type: 'text', text: last.text + event.text }]
              }
              return [...blocks, { type: 'text', text: event.text }]
            })
            break
          }

          case 'tool_use_start': {
            const toolBlock: ToolCallBlock = {
              type: 'tool_call',
              toolId: event.tool_id,
              toolName: event.tool_name,
              toolInput: event.tool_input,
              status: 'running',
            }
            updateAssistantMessage(msgId, blocks => [...blocks, toolBlock])
            break
          }

          case 'tool_result': {
            if (!event.is_error && ['create_page', 'update_page', 'delete_page'].includes(event.tool_name)) {
              window.dispatchEvent(new CustomEvent('dashboard:pages-changed'))
            }
            updateAssistantMessage(msgId, blocks =>
              blocks.map(b =>
                b.type === 'tool_call' && b.toolId === event.tool_id
                  ? { ...b, result: event.result, error: event.error, status: event.is_error ? ('error' as const) : ('done' as const) }
                  : b,
              ),
            )
            break
          }

          case 'approval_required': {
            const approvalBlock: ToolCallBlock = {
              type: 'tool_call',
              toolId: event.approval_id,
              toolName: event.tool_name,
              toolInput: event.tool_input,
              status: 'pending_approval',
              approvalId: event.approval_id,
              approvalDescription: event.description,
            }
            updateAssistantMessage(msgId, blocks => [...blocks, approvalBlock])
            break
          }

          case 'tool_rejected': {
            updateAssistantMessage(msgId, blocks =>
              blocks.map(b =>
                b.type === 'tool_call' && b.toolId === event.tool_id
                  ? { ...b, status: 'rejected' as const }
                  : b,
              ),
            )
            break
          }

          case 'done': {
            updatedMessages = event.messages ?? []
            updateAssistantMessage(msgId, b => b, false)
            break
          }

          case 'error': {
            setError(normalizeErrorMessage(event.error))
            const friendlyError = normalizeErrorMessage(event.error)
            updateAssistantMessage(msgId, blocks => [
              ...blocks,
              { type: 'text', text: `\n\n*Error: ${friendlyError}*` },
            ], false)
            break
          }
        }
      }

      return updatedMessages
    },
    [developer],
  )

  async function persistMessages(chatId: string, messages: ApiMessage[]) {
    try {
      const token = await getAuthToken()
      await fetch(apiUrl(`/api/ai/chats/${chatId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages }),
      })
      fetchChats()
    } catch {
      // non-fatal
    }
  }

  async function sendMessage(prompt: string) {
    if (!prompt.trim() || isStreaming || shared) return

    setError(null)
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    setIsStreaming(true)

    const userUiMsg: UIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      blocks: [{ type: 'text', text: prompt }],
      timestamp: new Date(),
    }
    setUiMessages(prev => [...prev, userUiMsg])
    isNearBottomRef.current = true
    developer?.devLog('sendMessage', { prompt: prompt.slice(0, 200), chatId: currentChatId })

    let chatId = currentChatId
    if (!chatId) {
      try {
        const token = await getAuthToken()
        const title = prompt.slice(0, 60) + (prompt.length > 60 ? '…' : '')
        const createRes = await fetch(apiUrl('/api/ai/chats'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title }),
        })
        if (!createRes.ok) throw new Error('Failed to create chat')
        const { chat } = await createRes.json()
        chatId = chat.id
        setCurrentChatId(chatId)
        // Mark before navigating so the routeChatId effect skips the reload
        justCreatedChatRef.current = chatId
        navigate(`/tariti-gpt/c/${chatId}`, { replace: true })
        setChats(prev => [{ id: chat.id, title: chat.title, updated_at: chat.updated_at }, ...prev])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create chat')
        setIsStreaming(false)
        return
      }
    }

    const newApiMessages: ApiMessage[] = [...apiMessages, { role: 'user', content: prompt }]
    const msgId = startAssistantMessage()

    try {
      const token = await getAuthToken()
      abortRef.current = new AbortController()

      const response = await fetch(apiUrl('/api/ai/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: newApiMessages }),
        signal: abortRef.current.signal,
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Request failed' }))
        const raw = errData.error ?? `HTTP ${response.status}`
        throw new Error(typeof raw === 'string' ? raw : JSON.stringify(raw))
      }

      const updatedMessages = await streamFromResponse(response, msgId)
      if (updatedMessages.length > 0) {
        setApiMessages(updatedMessages)
        if (chatId) await persistMessages(chatId, updatedMessages)
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      const msg = err instanceof Error ? err.message : 'Unexpected error'
      setError(normalizeErrorMessage(msg))
      updateAssistantMessage(msgId, blocks =>
        blocks.length === 0
          ? [{ type: 'text', text: 'Something went wrong. Please try again.' }]
          : blocks,
        false,
      )
    } finally {
      setIsStreaming(false)
      abortRef.current = null
      textareaRef.current?.focus()
    }
  }

  async function handleApprove(approvalId: string) {
    setIsStreaming(true)
    setError(null)

    setUiMessages(prev =>
      prev.map(m => ({
        ...m,
        blocks: m.blocks.map(b =>
          b.type === 'tool_call' && b.approvalId === approvalId
            ? { ...b, status: 'approved' as const }
            : b,
        ),
      })),
    )

    const msgId = startAssistantMessage()

    try {
      const token = await getAuthToken()

      const response = await fetch(apiUrl('/api/ai/approve'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ approval_id: approvalId }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Approval failed' }))
        throw new Error(errData.error ?? `HTTP ${response.status}`)
      }

      const updatedMessages = await streamFromResponse(response, msgId)
      if (updatedMessages.length > 0) {
        setApiMessages(updatedMessages)
        if (currentChatId) await persistMessages(currentChatId, updatedMessages)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unexpected error'
      setError(normalizeErrorMessage(msg))
      updateAssistantMessage(msgId, _ => [{ type: 'text', text: 'Failed to execute approved action.' }], false)
    } finally {
      setIsStreaming(false)
    }
  }

  async function handleReject(approvalId: string, reason?: string) {
    setIsStreaming(true)
    setError(null)

    setUiMessages(prev =>
      prev.map(m => ({
        ...m,
        blocks: m.blocks.map(b =>
          b.type === 'tool_call' && b.approvalId === approvalId
            ? { ...b, status: 'rejected' as const }
            : b,
        ),
      })),
    )

    const msgId = startAssistantMessage()

    try {
      const token = await getAuthToken()

      const response = await fetch(apiUrl('/api/ai/reject'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ approval_id: approvalId, reason }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Rejection failed' }))
        throw new Error(errData.error ?? `HTTP ${response.status}`)
      }

      const updatedMessages = await streamFromResponse(response, msgId)
      if (updatedMessages.length > 0) {
        setApiMessages(updatedMessages)
        if (currentChatId) await persistMessages(currentChatId, updatedMessages)
      }
    } catch {
      updateAssistantMessage(msgId, _ => [{ type: 'text', text: 'Action rejected.' }], false)
    } finally {
      setIsStreaming(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  function handleReset() {
    abortRef.current?.abort()
    setCurrentChatId(null)
    setUiMessages([INITIAL_MESSAGE])
    setApiMessages([])
    setInput('')
    setError(null)
    setIsStreaming(false)
    navigate('/tariti-gpt')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  async function handleShare() {
    if (!currentChatId) return
    try {
      const token = await getAuthToken()
      const res = await fetch(apiUrl(`/api/ai/chats/${currentChatId}/share`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Share failed')
      const { share_token } = await res.json()
      const url = `${window.location.origin}/tariti-gpt/shared/${share_token}`
      await navigator.clipboard.writeText(url)
      showToast('Share link copied to clipboard')
    } catch {
      showToast('Failed to create share link')
    }
  }

  const hasMessages = uiMessages.length > 1 || (uiMessages.length === 1 && uiMessages[0].id !== 'intro')
  const isEmptyState = !hasMessages && !loadingChat

  return (
    <div className="flex h-full bg-[#0a0a0c] text-slate-100 overflow-hidden">

      {/* ── Chat history sidebar ─────────────────────────────────────────── */}
      {!shared && (
        <div className={`flex-shrink-0 flex flex-col border-r border-slate-800 bg-slate-950 transition-all duration-200 ${sidebarOpen ? 'w-56' : 'w-0 overflow-hidden border-0'}`}>
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-3 pt-4 pb-2 flex-shrink-0">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Tariti</span>
            <button
              onClick={handleReset}
              title="New chat"
              className="h-6 w-6 rounded flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>

          {/* Chat list */}
          <div className="flex-1 overflow-y-auto px-1.5 pb-2" style={{ scrollbarWidth: 'none' }}>
            {chats.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-slate-600">No conversations yet</p>
            ) : (
              <div className="space-y-0.5">
                {chats.map(c => (
                  <div
                    key={c.id}
                    className="group relative"
                    onMouseEnter={() => setHoveredChat(c.id)}
                    onMouseLeave={() => setHoveredChat(null)}
                  >
                    <button
                      onClick={() => navigate(`/tariti-gpt/c/${c.id}`)}
                      className={`w-full text-left px-2.5 py-2 rounded-md text-sm transition-colors ${
                        currentChatId === c.id
                          ? 'bg-white/10 text-white'
                          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                      }`}
                    >
                      <span className="block truncate pr-5">{c.title || 'Untitled'}</span>
                      <span className="block text-[10px] text-slate-600 mt-0.5">
                        {new Date(c.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    </button>
                    {hoveredChat === c.id && (
                      <button
                        onClick={e => { e.stopPropagation(); deleteChat(c.id) }}
                        title="Delete chat"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Main chat area ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-slate-800/60">
          {!shared && (
            <button
              onClick={() => setSidebarOpen(s => !s)}
              title={sidebarOpen ? 'Hide history' : 'Show history'}
              className="h-7 w-7 flex items-center justify-center rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors flex-shrink-0"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
          )}

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${isStreaming ? 'bg-indigo-400 animate-pulse' : 'bg-emerald-400'}`} />
            <span className="text-sm font-medium text-slate-300 truncate">
              {shared ? 'Shared conversation' : (chats.find(c => c.id === currentChatId)?.title ?? 'Tariti')}
            </span>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {currentChatId && !shared && (
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                Share
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e293b transparent' }}
        >
          {loadingChat ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex gap-1.5">
                {[0, 150, 300].map(d => (
                  <span key={d} className="h-2 w-2 rounded-full bg-indigo-500/50 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          ) : isEmptyState ? (
            /* ── Empty state ── */
            <div className="flex flex-col items-center justify-center h-full px-4 py-12 text-center">
              <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5">
                <svg className="h-7 w-7 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v18" /><path d="m6 9 6-6 6 6" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-white mb-1">What can I help with?</h2>
              <p className="text-sm text-slate-500 mb-8 max-w-sm">
                I have full access to your dashboard, leads, analytics, AmoCRM, and Moizvonki.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s.text}
                    onClick={() => sendMessage(s.text)}
                    disabled={isStreaming}
                    className="flex items-start gap-3 px-4 py-3 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-left transition-colors disabled:opacity-40"
                  >
                    <span className="text-lg flex-shrink-0 mt-0.5">{s.icon}</span>
                    <span className="text-sm text-slate-300 leading-snug">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ── Message list ── */
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {uiMessages.map(message => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* ── Input area ── */}
        {!shared && (
          <div className="flex-shrink-0 border-t border-slate-800/60 px-4 py-3">
            {error && (
              <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 9v4M12 17h.01" strokeLinecap="round" /><circle cx="12" cy="12" r="10" />
                </svg>
                <span className="flex-1 truncate">{error}</span>
                <button onClick={() => setError(null)} className="flex-shrink-0 text-rose-400 hover:text-rose-200 transition-colors">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" /></svg>
                </button>
              </div>
            )}

            <div className="max-w-3xl mx-auto">
              <div className="flex items-end gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 focus-within:border-slate-600 transition-colors">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => { setInput(e.target.value); adjustTextarea() }}
                  onKeyDown={handleKeyDown}
                  placeholder="Message Tariti…"
                  rows={1}
                  disabled={isStreaming}
                  className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none disabled:opacity-60 leading-relaxed min-h-[1.5rem]"
                  style={{ maxHeight: '200px' }}
                />
                <div className="flex items-center gap-1.5 flex-shrink-0 pb-0.5">
                  {isStreaming ? (
                    <button
                      onClick={() => abortRef.current?.abort()}
                      title="Stop"
                      className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1" /></svg>
                    </button>
                  ) : (
                    <button
                      onClick={() => sendMessage(input)}
                      disabled={!input.trim()}
                      title="Send (Enter)"
                      className="h-8 w-8 flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-1.5 text-center text-[10px] text-slate-700">
                Shift+Enter for new line · Risky actions require your approval
              </p>
            </div>
          </div>
        )}

        {shared && (
          <div className="flex-shrink-0 border-t border-slate-800/60 px-4 py-3 text-center text-xs text-slate-600">
            This is a read-only shared conversation.
          </div>
        )}
      </div>

      {/* ── Toast notification ── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 shadow-2xl animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}
