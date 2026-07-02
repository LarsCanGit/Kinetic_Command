import React, { useEffect, useState } from 'react'
import * as db from '../db'

export default function CleanupModal({ onConfirm, onClose }) {
  const [days, setDays] = useState(30)
  const [scanned, setScanned] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [oldCompleted, setOldCompleted] = useState([])
  const [orphaned, setOrphaned] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  async function handleScan() {
    setLoading(true)
    setError('')
    try {
      const result = await db.getCleanupCandidates(days)
      setOldCompleted(result.oldCompleted)
      setOrphaned(result.orphaned)
      setSelectedIds(new Set([...result.oldCompleted, ...result.orphaned].map(t => t.id)))
      setScanned(true)
    } catch (err) {
      setError(err.message || 'Scan failed')
    } finally {
      setLoading(false)
    }
  }

  function toggleTask(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleCategory(list, allSelected) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      for (const t of list) {
        if (allSelected) next.delete(t.id)
        else next.add(t.id)
      }
      return next
    })
  }

  async function handleConfirm() {
    if (selectedIds.size === 0) return
    setLoading(true)
    setError('')
    try {
      await onConfirm(Array.from(selectedIds))
    } catch (err) {
      setError(err.message || 'Cleanup failed')
      setLoading(false)
    }
  }

  const oldCompletedAllSelected = oldCompleted.length > 0 && oldCompleted.every(t => selectedIds.has(t.id))
  const orphanedAllSelected = orphaned.length > 0 && orphaned.every(t => selectedIds.has(t.id))
  const nothingToClean = scanned && oldCompleted.length === 0 && orphaned.length === 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-surface-container-lowest/80 backdrop-blur-[20px]" />

      <div className="relative bg-surface-container-highest w-full max-w-lg shadow-2xl border border-outline-variant/15 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
          <h2 className="text-sm font-label uppercase tracking-widest font-bold text-on-surface">
            Clean Up Database
          </h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-2 block">
                Completed tasks older than
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={days}
                  onChange={e => setDays(e.target.value)}
                  className="w-20 bg-surface-container text-on-surface text-sm px-3 py-2 border border-outline-variant/20 focus:border-primary/50 outline-none"
                />
                <span className="text-xs text-on-surface-variant">days</span>
              </div>
            </div>
            <button
              onClick={handleScan}
              disabled={loading}
              className="bg-surface-container text-on-surface text-sm font-bold px-4 py-2 hover:bg-outline-variant/30 transition-colors disabled:opacity-50"
            >
              {loading && !scanned ? 'Scanning…' : 'Scan'}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-error text-xs">
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </div>
          )}

          {nothingToClean && (
            <div className="bg-surface-container p-4 text-sm text-on-surface-variant">
              Nothing to clean up.
            </div>
          )}

          {scanned && oldCompleted.length > 0 && (
            <div className="bg-surface-container p-4">
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={oldCompletedAllSelected}
                  onChange={() => toggleCategory(oldCompleted, oldCompletedAllSelected)}
                />
                <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">
                  Old completed tasks ({oldCompleted.length})
                </span>
              </label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {oldCompleted.map(t => (
                  <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(t.id)}
                      onChange={() => toggleTask(t.id)}
                    />
                    <span className="text-xs text-on-surface truncate">{t.title}</span>
                    <span className="text-[10px] text-on-surface-variant shrink-0">{t.projectName}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {scanned && orphaned.length > 0 && (
            <div className="bg-surface-container p-4">
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={orphanedAllSelected}
                  onChange={() => toggleCategory(orphaned, orphanedAllSelected)}
                />
                <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">
                  Orphaned tasks ({orphaned.length})
                </span>
              </label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {orphaned.map(t => (
                  <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(t.id)}
                      onChange={() => toggleTask(t.id)}
                    />
                    <span className="text-xs text-on-surface truncate">{t.title}</span>
                    <span className="text-[10px] text-on-surface-variant shrink-0">no project</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-outline-variant/10">
          <span className="text-xs text-on-surface-variant">
            {scanned ? `${selectedIds.size} selected` : ''}
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-label uppercase tracking-wider text-on-surface-variant hover:text-on-surface border border-outline-variant/20 hover:border-outline-variant/50 transition-colors"
            >
              Cancel
            </button>
            {scanned && !nothingToClean && (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading || selectedIds.size === 0}
                className="px-5 py-2 bg-error text-on-error text-xs font-label uppercase tracking-wider font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Delete Selected
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
