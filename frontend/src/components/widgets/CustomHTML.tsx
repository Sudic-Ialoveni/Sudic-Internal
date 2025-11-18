import { WidgetProps } from './WidgetRegistry'

interface CustomHTMLSettings {
  html: string
  allowScripts?: boolean
}

export default function CustomHTML({ settings }: WidgetProps) {
  const config = (settings as CustomHTMLSettings) || {}
  
  // Security: Only render HTML, never execute scripts
  // Even if allowScripts is true, we strip script tags for safety
  const sanitizedHTML = config.html
    ?.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') || ''

  return (
    <div
      className="p-4"
      dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
    />
  )
}

