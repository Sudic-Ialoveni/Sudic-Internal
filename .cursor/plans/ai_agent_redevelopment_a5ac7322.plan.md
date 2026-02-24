---
name: AI Agent Redevelopment
overview: Transform the dashboard into a Claude-powered AI agent with full tool access (pages, leads, analytics, AmoCRM, Moizvonki, web search, code execution) and a human-in-the-loop approval layer for destructive operations.
todos:
  - id: backend-tools-safe
    content: "Backend: Claude client + tool registry + safe tools (pages, leads, analytics)"
    status: completed
  - id: backend-ai-endpoint
    content: "Backend: /api/ai/chat streaming SSE endpoint"
    status: completed
  - id: backend-human-loop
    content: "Backend: Human-in-the-loop — risky tool classifier, pending state store, /api/ai/approve + /api/ai/reject"
    status: completed
  - id: backend-external-apis
    content: "Backend: AmoCRM, Moizvonki, Brave Search, code-exec tool implementations"
    status: completed
  - id: backend-system-prompt
    content: "Backend: System prompt with tool docs, widget schema knowledge, business context"
    status: completed
  - id: frontend-chat-ui
    content: "Frontend: Rewrite TaritiGPTPage with SSE streaming, MessageBubble, ToolCallCard"
    status: completed
  - id: frontend-approval-ui
    content: "Frontend: ApprovalCard component for human-in-the-loop risky tool confirmation"
    status: completed
isProject: false
---

