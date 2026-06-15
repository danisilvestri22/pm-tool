'use client'
import { useEffect } from 'react'

interface Props {
  message: string
  onUndo?: () => void
  onDismiss: () => void
  durationMs?: number
}

export default function Toast({ message, onUndo, onDismiss, durationMs = 8000 }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, durationMs)
    return () => clearTimeout(t)
  }, [onDismiss, durationMs])

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl flex items-center gap-4 shadow-lg z-50 whitespace-nowrap">
      <span>{message}</span>
      {onUndo && (
        <button
          onClick={onUndo}
          className="font-semibold text-emerald-300 hover:text-emerald-100"
        >
          Undo
        </button>
      )}
      <button onClick={onDismiss} className="text-gray-400 hover:text-white ml-1">
        ✕
      </button>
    </div>
  )
}
