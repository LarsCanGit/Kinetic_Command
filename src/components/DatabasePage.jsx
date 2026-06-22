import React, { useState, useRef } from 'react'
import RestoreConfirmModal from './RestoreConfirmModal'

export default function DatabasePage({ onExport, onRestore }) {
  const [restoreData, setRestoreData] = useState(null)
  const [restoreError, setRestoreError] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const fileInputRef = useRef(null)

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setRestoreError('')
    setRestoreData(null)

    file.text().then(text => {
      try {
        const data = JSON.parse(text)
        if (!data.version || !Array.isArray(data.projects) || !Array.isArray(data.tasks)) {
          setRestoreError('Invalid backup file: missing version, projects, or tasks')
          return
        }
        setRestoreData(data)
        setShowConfirm(true)
      } catch {
        setRestoreError('Invalid JSON file')
      }
    })

    e.target.value = ''
  }

  async function handleConfirmRestore() {
    setShowConfirm(false)
    try {
      await onRestore(restoreData)
    } catch (err) {
      setRestoreError(err.message || 'Restore failed')
    }
    setRestoreData(null)
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-headline font-black text-on-surface mb-8">Database</h1>

      <section>
        <h2 className="text-xs font-label text-on-surface-variant tracking-widest uppercase mb-4">Backup</h2>
        <div className="bg-surface-container-high p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-primary text-2xl">download</span>
            <div>
              <p className="text-sm font-bold text-on-surface">Back up database</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Download all projects and tasks as a JSON file
              </p>
            </div>
          </div>
          <button
            onClick={onExport}
            className="bg-surface-container-highest text-on-surface text-sm font-bold px-4 py-2 hover:bg-outline-variant/30 transition-colors"
          >
            Download
          </button>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xs font-label text-on-surface-variant tracking-widest uppercase mb-4">Restore</h2>
        <div className="bg-surface-container-high p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-primary text-2xl">upload</span>
            <div>
              <p className="text-sm font-bold text-on-surface">Restore from backup</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Replace all data with a previously exported backup file
              </p>
            </div>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-surface-container-highest text-on-surface text-sm font-bold px-4 py-2 hover:bg-outline-variant/30 transition-colors"
          >
            Upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
        {restoreError && (
          <div className="mt-3 flex items-center gap-2 text-error text-xs">
            <span className="material-symbols-outlined text-sm">error</span>
            {restoreError}
          </div>
        )}
      </section>

      {showConfirm && restoreData && (
        <RestoreConfirmModal
          projectCount={restoreData.projects.length}
          taskCount={restoreData.tasks.length}
          onConfirm={handleConfirmRestore}
          onClose={() => { setShowConfirm(false); setRestoreData(null) }}
        />
      )}
    </div>
  )
}
