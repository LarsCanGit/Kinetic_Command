import React from 'react'

export default function DatabasePage({ onExport }) {
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
    </div>
  )
}
