import React from 'react'

const NAV_ITEMS = [
  { icon: 'grid_view', label: 'Board', active: true, fill: true },
  { icon: 'speed', label: 'Sprint', active: false },
  { icon: 'analytics', label: 'Reports', active: false },
  { icon: 'package_2', label: 'Releases', active: false },
  { icon: 'bug_report', label: 'Issues', active: false },
]

export default function SideNav({ currentProject, onNewTask }) {
  return (
    <aside className="bg-[#001620] flex flex-col h-[calc(100vh-4rem)] fixed left-0 top-16 border-r border-[#1d4d63]/15 w-64 z-40">
      {/* Project badge */}
      <div className="p-6 border-b border-outline-variant/10">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-surface-container-high flex items-center justify-center rounded-sm">
            <span
              className="material-symbols-outlined text-primary text-lg"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              deployed_code
            </span>
          </div>
          <div>
            <h2 className="text-lg font-black text-cyan-500 font-headline leading-tight truncate max-w-[140px]">
              {currentProject?.name ?? '—'}
            </h2>
            <p className="text-[10px] font-label text-on-surface-variant tracking-widest uppercase">
              Kanban Board
            </p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="px-3 space-y-1">
          {NAV_ITEMS.map(item => (
            item.active ? (
              <a
                key={item.label}
                href="#"
                className="flex items-center gap-3 px-3 py-2 text-cyan-400 bg-[#002331] font-bold border-r-2 border-cyan-400 transition-all duration-100"
              >
                <span
                  className="material-symbols-outlined"
                  style={item.fill ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                <span className="text-sm">{item.label}</span>
              </a>
            ) : (
              <a
                key={item.label}
                href="#"
                className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:bg-[#002331]/50 hover:text-cyan-200 transition-all duration-100"
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </a>
            )
          ))}
        </div>
      </nav>

      {/* New Task button */}
      <div className="p-6">
        <button
          onClick={onNewTask}
          className="w-full bg-gradient-to-br from-primary to-primary-dim text-on-primary-fixed py-2 px-4 rounded-sm font-bold text-sm flex items-center justify-center gap-2 scale-95 active:scale-90 transition-transform hover:opacity-90"
          data-testid="sidebar-new-task-btn"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          New Task
        </button>
      </div>

      {/* Footer links */}
      <div className="border-t border-outline-variant/10 p-4 space-y-1">
        <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-cyan-200 transition-all text-xs">
          <span className="material-symbols-outlined text-sm">help</span>
          Support
        </a>
        <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-cyan-200 transition-all text-xs">
          <span className="material-symbols-outlined text-sm">description</span>
          Docs
        </a>
      </div>
    </aside>
  )
}
