import { WidgetProps } from './WidgetRegistry'

interface CustomHTMLSettings {
  html: string
  allowScripts?: boolean
}

export default function CustomHTML({ settings }: WidgetProps) {
  const config = (settings as CustomHTMLSettings) || {}

  // Strip script tags for safety regardless of allowScripts flag
  const sanitizedHTML = config.html
    ?.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') || ''

  return (
    <div
      className="p-5 text-slate-200 text-sm [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:text-white [&_h1]:mb-2
        [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mb-1.5
        [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-slate-200 [&_h3]:mb-1
        [&_p]:text-slate-300 [&_p]:leading-relaxed [&_p]:mb-2
        [&_a]:text-indigo-400 [&_a]:underline [&_a:hover]:text-indigo-300
        [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:space-y-0.5
        [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:space-y-0.5
        [&_li]:text-slate-300
        [&_strong]:text-white [&_strong]:font-semibold
        [&_em]:text-slate-300 [&_em]:italic
        [&_hr]:border-slate-700 [&_hr]:my-3
        [&_table]:w-full [&_table]:text-xs
        [&_th]:text-left [&_th]:p-2 [&_th]:bg-slate-700 [&_th]:text-slate-300 [&_th]:border [&_th]:border-slate-600
        [&_td]:p-2 [&_td]:border [&_td]:border-slate-700 [&_td]:text-slate-300
        overflow-hidden"
      dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
    />
  )
}
