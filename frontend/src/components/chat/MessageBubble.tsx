import { useEffect, useRef } from 'react'
import mermaid from 'mermaid'
import { UIMessage, UIBlock } from './types'
import { ToolCallCard } from './ToolCallCard'
import { ApprovalCard } from './ApprovalCard'
import { renderMarkdown } from './markdown'

let mermaidInited = false
function initMermaid() {
  if (mermaidInited) return
  mermaidInited = true
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
  })
}

interface MessageBubbleProps {
  message: UIMessage
  onApprove: (approvalId: string) => void
  onReject: (approvalId: string, reason?: string) => void
}

function renderBlock(
  block: UIBlock,
  onApprove: (approvalId: string) => void,
  onReject: (approvalId: string, reason?: string) => void,
  role: 'user' | 'assistant',
) {
  if (block.type === 'text') {
    if (!block.text) return null
    if (role === 'user') {
      return (
        <p key="text" className="text-sm leading-relaxed whitespace-pre-wrap">
          {block.text}
        </p>
      )
    }
    return (
      <div
        key="text"
        className="prose-chat text-sm leading-relaxed text-slate-100"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(block.text) }}
      />
    )
  }

  if (block.type === 'tool_call') {
    if (block.status === 'pending_approval' || block.status === 'approved' || block.status === 'rejected') {
      return (
        <ApprovalCard
          key={block.toolId}
          block={block}
          onApprove={onApprove}
          onReject={onReject}
        />
      )
    }
    return <ToolCallCard key={block.toolId} block={block} />
  }

  return null
}

export function MessageBubble({ message, onApprove, onReject }: MessageBubbleProps) {
  const isAssistant = message.role === 'assistant'
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!contentRef.current) return
    const nodes = contentRef.current.querySelectorAll('.mermaid')
    if (nodes.length) {
      initMermaid()
      mermaid.run({ nodes: Array.from(nodes) as HTMLElement[] }).catch(() => {})
    }
  }, [message.blocks])

  if (!isAssistant) {
    // User message — right-aligned bubble
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-indigo-600 px-4 py-2.5">
          {message.blocks.map((block, i) =>
            block.type === 'text' ? (
              <p key={i} className="text-sm leading-relaxed whitespace-pre-wrap text-white">{block.text}</p>
            ) : null
          )}
        </div>
      </div>
    )
  }

  // Assistant message — left-aligned, no bubble, just content
  return (
    <div className="flex gap-3 min-w-0">
      {/* Small "T" avatar */}
      <div className="h-6 w-6 flex-shrink-0 flex items-center justify-center rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[10px] font-bold text-indigo-300 mt-0.5">
        T
      </div>

      <div className="flex-1 min-w-0" ref={contentRef}>
        {/* Streaming thinking indicator (empty assistant message) */}
        {message.blocks.length === 0 && message.isStreaming && (
          <div className="flex gap-1 items-center pt-1">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500/60 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500/60 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500/60 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}

        <div className="space-y-2">
          {message.blocks.map((block, i) => (
            <div key={i}>
              {renderBlock(block, onApprove, onReject, message.role)}
            </div>
          ))}
        </div>

        {/* Inline cursor blink at end of streaming text */}
        {message.isStreaming && message.blocks.length > 0 && (
          <span className="inline-block w-0.5 h-4 bg-indigo-400 animate-pulse ml-0.5 align-middle" />
        )}
      </div>
    </div>
  )
}
