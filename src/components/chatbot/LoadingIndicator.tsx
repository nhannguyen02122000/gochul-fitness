'use client'

interface LoadingIndicatorProps {
  /** 'thinking' = initial tool loop; 'responding' = streaming active */
  phase?: 'thinking' | 'responding'
  /** true when content has started appearing in the last assistant bubble */
  hasContent?: boolean
}

export default function LoadingIndicator({
  phase = 'thinking',
  hasContent = false,
}: LoadingIndicatorProps) {
  const label = hasContent ? 'Responding...' : 'ChulFitCoach is thinking...'

  return (
    <div
      className="flex items-center gap-1.5 px-4 py-2"
      aria-live="polite"
      aria-label={hasContent ? 'AI is responding' : 'AI is thinking'}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[var(--color-cta)]"
          style={{
            animation: `chatbot-dot-bounce 1.2s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">{label}</span>
      <style>{`
        @keyframes chatbot-dot-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
