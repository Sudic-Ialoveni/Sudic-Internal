import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Joyride, { ACTIONS, EVENTS, STATUS, type CallBackProps, type Step } from 'react-joyride'
import { useNavigate } from 'react-router-dom'
import { useOnboarding } from '@/contexts/OnboardingContext'

const joyrideStyles = {
  options: {
    zIndex: 10050,
    arrowColor: '#1e293b',
    backgroundColor: '#1e293b',
    textColor: '#e2e8f0',
    primaryColor: '#6366f1',
    overlayColor: 'rgba(15, 23, 42, 0.88)',
  },
  tooltip: { borderRadius: 12, padding: 16 },
  tooltipContainer: { textAlign: 'left' as const },
  buttonNext: { borderRadius: 8, fontSize: 13 },
  buttonBack: { borderRadius: 8, fontSize: 13, color: '#94a3b8' },
  buttonSkip: { color: '#94a3b8', fontSize: 13 },
  spotlight: { borderRadius: 10 },
}

const LAST_INDEX = 7

export default function AppOnboardingTour() {
  const { loading, tourPending, tourRun, setTourRun, tourKey, completeTour } = useOnboarding()
  const navigate = useNavigate()
  const [stepIndex, setStepIndex] = useState(0)
  const finishOnce = useRef(false)

  useEffect(() => {
    setStepIndex(0)
    finishOnce.current = false
  }, [tourKey])

  const steps = useMemo<Step[]>(
    () => [
      {
        target: 'body',
        title: 'Welcome to Sudic Internal',
        content: (
          <div className="space-y-2 text-sm leading-relaxed">
            <p>
              This short tour walks through navigation, TaritiGPT, and Settings — including API keys and AI
              customization. Use <strong className="text-white">Skip for now</strong> to dismiss; the tour will start
              again on your next visit until you finish.
            </p>
          </div>
        ),
        placement: 'center',
        disableBeacon: true,
        isFixed: true,
      },
      {
        target: '[data-tour="nav-overview"]',
        title: 'Overview',
        content: (
          <p className="text-sm leading-relaxed">
            Open <strong className="text-white">Overview</strong> for your dashboard and published pages. The sidebar is
            always available from any screen.
          </p>
        ),
        disableBeacon: true,
      },
      {
        target: '[data-tour="nav-tariti"]',
        title: 'TaritiGPT Studio',
        content: (
          <p className="text-sm leading-relaxed">
            <strong className="text-white">TaritiGPT</strong> is your operations assistant — chat, tools, and streaming
            replies. The next step opens this workspace.
          </p>
        ),
        disableBeacon: true,
      },
      {
        target: '[data-tour="tariti-main"]',
        title: 'Chat workspace',
        content: (
          <p className="text-sm leading-relaxed">
            Ask for analytics, CRM actions, page builds, or run <code className="text-indigo-300">/setup</code> in chat
            for a guided conversation. Use the history sidebar for past threads.
          </p>
        ),
        disableBeacon: true,
      },
      {
        target: '[data-tour="nav-settings"]',
        title: 'Settings',
        content: (
          <p className="text-sm leading-relaxed">
            <strong className="text-white">Settings</strong> is where you add API keys, tune AI behavior, and manage your
            profile. Next we will open the API keys tab.
          </p>
        ),
        disableBeacon: true,
      },
      {
        target: '[data-tour="settings-keys-panel"]',
        title: 'API keys & model',
        content: (
          <div className="space-y-2 text-sm leading-relaxed">
            <p>
              Add optional Anthropic and OpenAI keys (stored server-side only). Use <strong className="text-white">Test</strong>{' '}
              to validate before saving. Choose your provider and fallback options here.
            </p>
          </div>
        ),
        disableBeacon: true,
        placement: 'bottom',
      },
      {
        target: '[data-tour="settings-ai-panel"]',
        title: 'AI memory & behavior',
        content: (
          <p className="text-sm leading-relaxed">
            Long-term memory, personality, and custom instructions apply to every Tariti reply. Refine this over time as
            your workflows evolve.
          </p>
        ),
        disableBeacon: true,
        placement: 'bottom',
      },
      {
        target: '[data-tour="settings-profile-panel"]',
        title: 'Profile',
        content: (
          <div className="space-y-2 text-sm leading-relaxed">
            <p>
              Set how you appear in the app. Press <strong className="text-white">Finish setup</strong> on this step to
              complete the tour. You can run it again from <strong className="text-white">Settings → Developer</strong>{' '}
              (reset).
            </p>
          </div>
        ),
        disableBeacon: true,
        placement: 'bottom',
      },
    ],
    [],
  )

  const run = !loading && tourRun && tourPending

  const handleCallback = useCallback(
    (data: CallBackProps) => {
      const { action, index, status, type } = data

      if (status === STATUS.SKIPPED) {
        setTourRun(false)
        return
      }

      if (status === STATUS.FINISHED) {
        if (!finishOnce.current) {
          finishOnce.current = true
          void completeTour()
        }
        return
      }

      if (type !== EVENTS.STEP_AFTER || action !== ACTIONS.NEXT) {
        return
      }

      const go = (nextIndex: number, to: string) => {
        navigate(to)
        window.setTimeout(() => setStepIndex(nextIndex), 450)
      }

      if (index === 2) {
        go(3, '/tariti-gpt')
        return
      }
      if (index === 4) {
        go(5, '/settings?tab=keys')
        return
      }
      if (index === 5) {
        go(6, '/settings?tab=ai')
        return
      }
      if (index === 6) {
        go(7, '/settings?tab=profile')
        return
      }

      if (index < LAST_INDEX) {
        setStepIndex(index + 1)
      }
    },
    [completeTour, navigate, setTourRun],
  )

  if (!run) {
    return null
  }

  return (
    <Joyride
      key={tourKey}
      run={run}
      stepIndex={stepIndex}
      steps={steps}
      continuous
      showProgress
      showSkipButton
      hideCloseButton
      scrollOffset={80}
      scrollDuration={400}
      hideBackButton
      spotlightPadding={10}
      callback={handleCallback}
      styles={joyrideStyles}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish setup',
        next: 'Next',
        skip: 'Skip for now',
        nextLabelWithProgress: 'Next ({step} of {steps})',
      }}
      floaterProps={{
        styles: {
          floater: { filter: 'drop-shadow(0 12px 32px rgba(0,0,0,0.45))' },
        },
      }}
    />
  )
}
