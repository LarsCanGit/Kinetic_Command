import React from 'react'

export default function TopNav() {
  return (
    <header className="bg-[#001019] flex justify-between items-center w-full px-6 h-16 border-b border-[#1d4d63]/15 fixed top-0 z-50">
      <div className="flex items-center gap-8">
        <span className="text-xl font-bold tracking-widest text-cyan-400 uppercase font-headline">
          KINETIC_COMMAND
        </span>
        <nav className="hidden md:flex items-center gap-6">
          <a className="text-cyan-400 border-b-2 border-cyan-400 pb-1 font-headline tracking-tight" href="#">
            Projects
          </a>
          <a className="text-slate-400 hover:text-cyan-300 transition-colors duration-150 font-headline tracking-tight" href="#">
            Team
          </a>
          <a className="text-slate-400 hover:text-cyan-300 transition-colors duration-150 font-headline tracking-tight" href="#">
            Backlog
          </a>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden sm:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
            search
          </span>
          <input
            className="bg-surface-container-low border-none border-b border-outline-variant/30 text-sm pl-10 pr-4 py-1.5 w-64 focus:ring-0 focus:bg-surface-container-high transition-all text-on-surface placeholder:text-on-surface-variant/50"
            placeholder="CMD + K to search"
            type="text"
            readOnly
          />
        </div>
        <button className="text-on-surface-variant hover:text-primary transition-colors duration-150 scale-95 active:scale-90 w-11 h-11 flex items-center justify-center">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="text-on-surface-variant hover:text-primary transition-colors duration-150 scale-95 active:scale-90 w-11 h-11 flex items-center justify-center">
          <span className="material-symbols-outlined">settings</span>
        </button>
        <div className="w-8 h-8 rounded-full border border-outline-variant bg-surface-container-high flex items-center justify-center">
          <span className="material-symbols-outlined text-sm text-on-surface-variant">person</span>
        </div>
      </div>
    </header>
  )
}
