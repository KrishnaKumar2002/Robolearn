import { useState } from 'react'
import './App.css'
import ControlLab from './labs/ControlLab'
import RLLab from './labs/RLLab'
import ImitationLab from './labs/ImitationLab'
import PerceptionLab from './labs/PerceptionLab'

function App() {
  const [activeLab, setActiveLab] = useState('control')

  return (
    <div className="flex h-screen bg-slate-900 text-slate-50 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            RoboLearn Explorer
          </h1>
          <p className="text-xs text-slate-400 mt-1">Interactive ML for Robotics</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          <button 
            onClick={() => setActiveLab('control')}
            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${activeLab === 'control' ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-300'}`}
          >
            Control Lab (MPC/PID)
          </button>
          <button 
            onClick={() => setActiveLab('rl')}
            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${activeLab === 'rl' ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-300'}`}
          >
            RL Lab (Q-Learning)
          </button>
          <button 
            onClick={() => setActiveLab('imitation')}
            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${activeLab === 'imitation' ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-300'}`}
          >
            Imitation Lab (LfD)
          </button>
          <button 
            onClick={() => setActiveLab('perception')}
            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${activeLab === 'perception' ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-300'}`}
          >
            Perception Lab (CV)
          </button>
        </nav>
        <div className="p-4 border-t border-slate-700 text-xs text-slate-500 text-center">
          Powered by React & Canvas
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        <header className="h-16 border-b border-slate-700 bg-slate-800/50 backdrop-blur flex items-center px-6">
          <h2 className="text-lg font-semibold capitalize">{activeLab} Lab</h2>
        </header>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeLab === 'control' && <ControlLab />}
          {activeLab === 'rl' && <RLLab />}
          {activeLab === 'imitation' && <ImitationLab />}
          {activeLab === 'perception' && <PerceptionLab />}
          {(activeLab !== 'control' && activeLab !== 'rl' && activeLab !== 'imitation' && activeLab !== 'perception') && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl flex-1 overflow-hidden relative flex items-center justify-center">
              <p className="text-slate-500">Coming soon... ({activeLab})</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
