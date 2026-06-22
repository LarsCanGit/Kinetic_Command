import React, { useEffect } from 'react'

export default function RestoreConfirmModal({ projectCount, taskCount, onConfirm, onClose }) {
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-surface-container-lowest/80 backdrop-blur-[20px]" />

      <div className="relative bg-surface-container-highest w-full max-w-md shadow-2xl border border-outline-variant/15">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
          <h2 className="text-sm font-label uppercase tracking-widest font-bold text-on-surface">
            Confirm Restore
          </h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-error text-2xl mt-0.5">warning</span>
            <div>
              <p className="text-sm text-on-surface font-bold">This will replace all current data</p>
              <p className="text-xs text-on-surface-variant mt-1">
                Your existing projects and tasks will be permanently overwritten with the backup contents.
                This cannot be undone.
              </p>
            </div>
          </div>

          <div className="bg-surface-container p-4">
            <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-2">
              Backup contains
            </p>
            <div className="flex gap-6">
              <div>
                <span className="text-lg font-headline font-black text-on-surface">{projectCount}</span>
                <span className="text-xs text-on-surface-variant ml-1.5">
                  {projectCount === 1 ? 'project' : 'projects'}
                </span>
              </div>
              <div>
                <span className="text-lg font-headline font-black text-on-surface">{taskCount}</span>
                <span className="text-xs text-on-surface-variant ml-1.5">
                  {taskCount === 1 ? 'task' : 'tasks'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-label uppercase tracking-wider text-on-surface-variant hover:text-on-surface border border-outline-variant/20 hover:border-outline-variant/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-5 py-2 bg-error text-on-error text-xs font-label uppercase tracking-wider font-bold hover:opacity-90 transition-opacity"
            >
              Restore
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
