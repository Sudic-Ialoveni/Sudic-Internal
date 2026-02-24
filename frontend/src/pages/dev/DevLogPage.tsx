import { useDeveloper } from '@/contexts/DeveloperContext'

export default function DevLogPage() {
  const developer = useDeveloper()

  if (!developer?.developerMode) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900 p-8">
        <p className="text-slate-400">Enable Developer mode in Settings to view the monitoring log.</p>
      </div>
    )
  }

  const { logEntries, clearLog } = developer

  return (
    <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <h1 className="text-lg font-semibold text-white">Monitoring log</h1>
        <button
          onClick={clearLog}
          className="px-3 py-1.5 rounded-lg text-sm bg-slate-700 hover:bg-slate-600 text-slate-200"
        >
          Clear log
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4 font-mono text-xs">
        {logEntries.length === 0 ? (
          <p className="text-slate-500">No entries yet. Use devLog() in code or trigger actions that log when developer mode is on.</p>
        ) : (
          <div className="space-y-2">
            {[...logEntries].reverse().map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg bg-slate-800/80 border border-slate-700/60 px-3 py-2 text-slate-300"
              >
                <span className="text-amber-400/90">{entry.time}</span>
                <pre className="mt-1 whitespace-pre-wrap break-all">
                  {entry.args.map((a) =>
                    typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a),
                  ).join(' ')}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
