interface LoadingSpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
}

export function LoadingSpinner({ className = '', size = 'md' }: LoadingSpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full border-2 border-slate-600 border-t-slate-300 ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}

export function PageLoading() {
  return (
    <div className="flex-1 flex items-center justify-center bg-slate-900 min-h-[40vh]">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    </div>
  )
}
