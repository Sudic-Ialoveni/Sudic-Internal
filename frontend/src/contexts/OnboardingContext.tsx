import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, apiPatch } from '@/lib/api'

type OnboardingContextValue = {
  loading: boolean
  /** Server flag: user has not finished the product tour. */
  tourPending: boolean
  /** Joyride run state (also true after dev reset). */
  tourRun: boolean
  setTourRun: (v: boolean) => void
  tourKey: number
  refresh: () => Promise<void>
  completeTour: () => Promise<void>
  resetTour: () => Promise<void>
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [tourPending, setTourPending] = useState(false)
  const [tourRun, setTourRun] = useState(false)
  const [tourKey, setTourKey] = useState(0)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiFetch<{ preferences: { app_onboarding_completed?: boolean } }>(
        '/api/user/preferences',
      )
      const done = data.preferences?.app_onboarding_completed === true
      setTourPending(!done)
      setTourRun(!done)
    } catch {
      setTourPending(false)
      setTourRun(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const completeTour = useCallback(async () => {
    const data = await apiPatch<{ preferences: { app_onboarding_completed?: boolean } }>(
      '/api/user/preferences',
      { app_onboarding_completed: true },
    )
    if (data.preferences?.app_onboarding_completed !== true) {
      throw new Error('Server did not confirm onboarding completion.')
    }
    setTourPending(false)
    setTourRun(false)
  }, [])

  const resetTour = useCallback(async () => {
    await apiPatch('/api/user/preferences', { app_onboarding_completed: false })
    setTourPending(true)
    setTourRun(true)
    setTourKey((k) => k + 1)
    navigate('/', { replace: true })
  }, [navigate])

  const value = useMemo(
    () => ({
      loading,
      tourPending,
      tourRun,
      setTourRun,
      tourKey,
      refresh,
      completeTour,
      resetTour,
    }),
    [loading, tourPending, tourRun, tourKey, refresh, completeTour, resetTour],
  )

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider')
  return ctx
}
