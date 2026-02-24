import { useNavigate } from 'react-router-dom'
import { WidgetProps } from './WidgetRegistry'

export default function TaritiGPTPrompt({ settings }: WidgetProps) {
  const navigate = useNavigate()
  const label = (settings as Record<string, string>)?.label || 'Ask Tariti'
  const placeholder = (settings as Record<string, string>)?.placeholder || 'What can I help with?'

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[160px] p-6 text-center gap-4">
      <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
        <svg className="h-5 w-5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v18" /><path d="m6 9 6-6 6 6" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-200">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{placeholder}</p>
      </div>
      <button
        onClick={() => navigate('/tariti-gpt')}
        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
      >
        Open Tariti
      </button>
    </div>
  )
}
