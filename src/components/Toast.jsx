import React from 'react'

export default function Toast({ toasts }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-24 right-8 space-y-2 z-50 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`px-4 py-3 text-xs font-label tracking-wide shadow-xl flex items-center gap-3 ${
            toast.type === 'error'
              ? 'bg-error-container border-l-2 border-error text-on-error-container'
              : 'bg-surface-container-highest border-l-2 border-tertiary text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-sm">
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          {toast.message}
        </div>
      ))}
    </div>
  )
}
