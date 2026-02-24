import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

const MAX_LOG_ENTRIES = 500

export type DevLogEntry = {
  id: number
  time: string
  args: unknown[]
}

type DeveloperContextValue = {
  developerMode: boolean
  setDeveloperMode: (on: boolean) => void
  devLog: (...args: unknown[]) => void
  logEntries: DevLogEntry[]
  clearLog: () => void
}

const DeveloperContext = createContext<DeveloperContextValue | null>(null)

let nextId = 0

export function DeveloperProvider({ children }: { children: React.ReactNode }) {
  const [developerMode, setDeveloperModeState] = useState(false)
  const [logEntries, setLogEntries] = useState<DevLogEntry[]>([])
  const developerModeRef = useRef(developerMode)
  developerModeRef.current = developerMode

  const setDeveloperMode = useCallback((on: boolean) => {
    setDeveloperModeState(on)
  }, [])

  const devLog = useCallback((...args: unknown[]) => {
    if (!developerModeRef.current) return
    console.log('[Dev]', ...args)
    const entry: DevLogEntry = {
      id: ++nextId,
      time: new Date().toISOString(),
      args: [...args],
    }
    setLogEntries((prev) => {
      const next = [...prev, entry]
      return next.length > MAX_LOG_ENTRIES ? next.slice(-MAX_LOG_ENTRIES) : next
    })
  }, [])

  const clearLog = useCallback(() => setLogEntries([]), [])

  const value = useMemo(
    () => ({
      developerMode,
      setDeveloperMode,
      devLog,
      logEntries,
      clearLog,
    }),
    [developerMode, setDeveloperMode, devLog, logEntries, clearLog],
  )

  return (
    <DeveloperContext.Provider value={value}>
      {children}
    </DeveloperContext.Provider>
  )
}

export function useDeveloper() {
  const ctx = useContext(DeveloperContext)
  return ctx
}
