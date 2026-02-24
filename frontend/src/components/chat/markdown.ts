function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Lightweight markdown → HTML converter for chat messages
export function renderMarkdown(text: string): string {
  const mermaidBlocks: string[] = []
  let html = text.replace(/```mermaid\n?([\s\S]*?)```/g, (_, code) => {
    const i = mermaidBlocks.length
    mermaidBlocks.push(code.trim())
    return `\n\nMERMAID_BLOCK_${i}_END\n\n`
  })

  // Escape HTML entities
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Code blocks (``` ... ```) — avoid matching MERMAID_BLOCK_ placeholders
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const langAttr = lang ? ` data-lang="${lang}"` : ''
    return `<pre${langAttr}><code>${code.trimEnd()}</code></pre>`
  })

  // Inline code
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>')

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Tables
  html = html.replace(/(\|.+\|\n)+/g, (table) => {
    const rows = table.trim().split('\n')
    const headerRow = rows[0]
    const separatorRow = rows[1]
    const bodyRows = rows.slice(2)

    if (!separatorRow || !/^\|[\s\-|:]+\|$/.test(separatorRow)) {
      return table
    }

    const parseRow = (row: string, tag: string) =>
      `<tr>${row
        .split('|')
        .slice(1, -1)
        .map(cell => `<${tag}>${cell.trim()}</${tag}>`)
        .join('')}</tr>`

    const thead = `<thead>${parseRow(headerRow, 'th')}</thead>`
    const tbody = bodyRows.length
      ? `<tbody>${bodyRows.map(r => parseRow(r, 'td')).join('')}</tbody>`
      : ''

    return `<table>${thead}${tbody}</table>`
  })

  // Unordered lists
  html = html.replace(/((?:^[ \t]*[-*+] .+\n?)+)/gm, (list) => {
    const items = list.trim().split('\n').map(item =>
      `<li>${item.replace(/^[ \t]*[-*+] /, '').trim()}</li>`
    )
    return `<ul>${items.join('')}</ul>`
  })

  // Ordered lists
  html = html.replace(/((?:^[ \t]*\d+\. .+\n?)+)/gm, (list) => {
    const items = list.trim().split('\n').map(item =>
      `<li>${item.replace(/^[ \t]*\d+\. /, '').trim()}</li>`
    )
    return `<ol>${items.join('')}</ol>`
  })

  // Horizontal rules
  html = html.replace(/^---+$/gm, '<hr />')

  // Paragraphs (double newlines)
  html = html.replace(/\n{2,}/g, '</p><p>')
  if (!html.startsWith('<') || html.startsWith('<code') || html.startsWith('<em') || html.startsWith('<strong')) {
    html = `<p>${html}</p>`
  }

  // Single newlines (not inside blocks)
  html = html.replace(/(?<!>)\n(?!<)/g, '<br />')

  // Inject mermaid diagram divs
  mermaidBlocks.forEach((block, i) => {
    html = html.replace(`MERMAID_BLOCK_${i}_END`, `<div class="mermaid">${escapeHtml(block)}</div>`)
  })

  return html
}
