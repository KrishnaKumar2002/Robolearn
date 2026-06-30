import React, { useState, useRef, useCallback } from 'react';
import SimulationCanvas from '../components/SimulationCanvas';
import ExerciseTracker from '../components/ExerciseTracker';

// Grid World: 0 = empty, 1 = wall, 2 = goal, 3 = trap
const GRID_SIZE = 10;
const MAP = [
  [0, 0, 0, 0, 0, 1, 0, 0, 0, 2],
  [0, 1, 1, 0, 0, 1, 0, 1, 0, 0],
  [0, 0, 1, 0, 0, 0, 0, 1, 1, 0],
  [1, 0, 1, 1, 1, 3, 1, 1, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 1, 0, 1, 1, 1, 1, 0],
  [0, 0, 0, 1, 0, 0, 0, 3, 1, 0],
  [1, 1, 0, 1, 1, 1, 0, 0, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

const RLLab = () => {
  const [training, setTraining] = useState(false);
  const [episodes, setEpisodes] = useState(0);
  const [epsilon, setEpsilon] = useState(1.0); // Exploration rate
  
  const [hasExplored, setHasExplored] = useState(false);
  const [hasFoundGoal, setHasFoundGoal] = useState(false);
  const [isOptimized, setIsOptimized] = useState(false);

  const qTable = useRef(new Float32Array(GRID_SIZE * GRID_SIZE * 4)); 
  const stateRef = useRef({
    agentX: 0,
    agentY: 9,
    steps: 0,
    history: []
  });

  const getQ = (x, y, a) => qTable.current[(y * GRID_SIZE + x) * 4 + a];
  const setQ = (x, y, a, val) => { qTable.current[(y * GRID_SIZE + x) * 4 + a] = val; };

  const update = useCallback((dt) => {
    if (!training) return;
    
    for (let i = 0; i < 50; i++) { // Run 50 steps per frame for fast visual training
      const state = stateRef.current;
      const { agentX: x, agentY: y } = state;

      // Epsilon-greedy action selection
      let action = 0;
      if (Math.random() < epsilon) {
        action = Math.floor(Math.random() * 4); // Explore
      } else {
        // Exploit
        let maxQ = -Infinity;
        for (let a = 0; a < 4; a++) {
          const q = getQ(x, y, a);
          if (q > maxQ) { maxQ = q; action = a; }
        }
      }

      // 0: up, 1: right, 2: down, 3: left
      let nx = x, ny = y;
      if (action === 0) ny -= 1;
      if (action === 1) nx += 1;
      if (action === 2) ny += 1;
      if (action === 3) nx -= 1;

      // Bounds & Walls
      if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE || MAP[ny][nx] === 1) {
        nx = x; ny = y;
      }

      // Rewards
      const cell = MAP[ny][nx];
      let reward = -0.01; // Step penalty
      let done = false;

      if (cell === 2) {
        reward = 1.0; // Goal
        done = true;
        setHasFoundGoal(true);
      } else if (cell === 3) {
        reward = -1.0; // Trap
        done = true;
      }

      // Bellman update
      let maxNextQ = -Infinity;
      for (let a = 0; a < 4; a++) {
        const q = getQ(nx, ny, a);
        if (q > maxNextQ) maxNextQ = q;
      }

      const currentQ = getQ(x, y, action);
      const newQ = currentQ + 0.1 * (reward + 0.99 * maxNextQ - currentQ);
      setQ(x, y, action, newQ);

      state.agentX = nx;
      state.agentY = ny;
      state.steps++;
      
      if (done || state.steps > 200) {
        state.agentX = 0;
        state.agentY = 9;
        
        if (cell === 2 && state.steps < 20) {
           setIsOptimized(true);
        }
        
        state.steps = 0;
        setEpisodes(ep => {
          const newEp = ep + 1;
          setEpsilon(Math.max(0.01, 1.0 - newEp / 500));
          if (newEp > 100) setHasExplored(true);
          return newEp;
        });
      }
    }
  }, [training, epsilon]);

  const draw = useCallback((ctx, width, height) => {
    const cellSize = Math.min(width, height) / GRID_SIZE;
    const offsetX = (width - cellSize * GRID_SIZE) / 2;
    const offsetY = (height - cellSize * GRID_SIZE) / 2;

    ctx.translate(offsetX, offsetY);

    // Draw Map & Q-Values
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = MAP[y][x];
        const px = x * cellSize;
        const py = y * cellSize;

        // Background
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(px, py, cellSize, cellSize);

        if (cell === 1) { // Wall
          ctx.fillStyle = '#475569';
          ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
        } else if (cell === 2) { // Goal
          ctx.fillStyle = '#22c55e'; // green
          ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
        } else if (cell === 3) { // Trap
          ctx.fillStyle = '#ef4444'; // red
          ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
        } else {
          // Draw Q-value heatmap arrows
          let maxQ = -Infinity, bestA = 0;
          for (let a=0; a<4; a++) {
            const q = getQ(x, y, a);
            if (q > maxQ) { maxQ = q; bestA = a; }
          }
          if (maxQ > 0.01) {
            ctx.fillStyle = `rgba(56, 189, 248, ${Math.min(maxQ * 2, 1)})`;
            ctx.beginPath();
            const cx = px + cellSize/2;
            const cy = py + cellSize/2;
            const arrSize = cellSize/4;
            if (bestA === 0) { ctx.moveTo(cx, cy - arrSize); ctx.lineTo(cx - arrSize/2, cy); ctx.lineTo(cx + arrSize/2, cy); }
            if (bestA === 1) { ctx.moveTo(cx + arrSize, cy); ctx.lineTo(cx, cy - arrSize/2); ctx.lineTo(cx, cy + arrSize/2); }
            if (bestA === 2) { ctx.moveTo(cx, cy + arrSize); ctx.lineTo(cx - arrSize/2, cy); ctx.lineTo(cx + arrSize/2, cy); }
            if (bestA === 3) { ctx.moveTo(cx - arrSize, cy); ctx.lineTo(cx, cy - arrSize/2); ctx.lineTo(cx, cy + arrSize/2); }
            ctx.fill();
          }
        }
        
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(px, py, cellSize, cellSize);
      }
    }

    // Draw Agent
    const state = stateRef.current;
    ctx.fillStyle = '#eab308'; // yellow
    ctx.beginPath();
    ctx.arc(state.agentX * cellSize + cellSize/2, state.agentY * cellSize + cellSize/2, cellSize/3, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(-offsetX, -offsetY);
  }, []);

  return (
    <div className="flex flex-col xl:flex-row h-full w-full bg-slate-900 overflow-y-auto xl:overflow-hidden">
      
      {/* Simulation Area */}
      <div className="flex-1 bg-slate-950 relative min-h-[50vh] xl:min-h-0 min-w-0 overflow-hidden">
        <SimulationCanvas draw={draw} update={update} width={800} height={800} className="w-full h-full object-contain p-4" />
      </div>

      {/* Scrollable Right Sidebar */}
      <div className="w-full xl:w-[400px] flex flex-col bg-slate-800/90 backdrop-blur-xl border-t xl:border-t-0 xl:border-l border-slate-700/50 overflow-y-visible xl:overflow-y-auto shrink-0 shadow-2xl z-10 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
        
        {/* Dashboard Header */}
        <div className="p-5 border-b border-slate-700/50 bg-slate-800/80">
          <h2 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-1">
            Q-Learning AI
          </h2>
          <p className="text-xs text-slate-400">
            Watch the AI learn to navigate the maze through trial and error. Blue arrows indicate the learned Q-values (expected rewards).
          </p>
        </div>

        {/* Live Metrics */}
        <div className="p-5 border-b border-slate-700/50 bg-slate-900/50">
          <h3 className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-wider">Learning Telemetry</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700/50 shadow-inner flex flex-col">
              <div className="text-[10px] text-slate-500 mb-1 uppercase">Episodes</div>
              <div className="text-lg font-mono text-purple-400">{episodes}</div>
            </div>
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700/50 shadow-inner flex flex-col">
              <div className="text-[10px] text-slate-500 mb-1 uppercase">Exploration Rate</div>
              <div className="text-lg font-mono text-pink-400">{epsilon.toFixed(2)}</div>
            </div>
          </div>
          
          <div className="bg-slate-800 p-3 rounded-lg border border-slate-700/50 shadow-inner">
             <div className="text-[10px] text-slate-500 mb-2 uppercase">Status</div>
             <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${training ? 'bg-pink-500 animate-pulse' : 'bg-slate-500'}`}></div>
                <span className="text-sm font-semibold text-slate-300">
                  {training ? (epsilon > 0.1 ? 'Exploring map...' : 'Exploiting known paths...') : 'Training Paused'}
                </span>
             </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="p-5 border-b border-slate-700/50 bg-slate-800/60 shadow-inner">
           <h3 className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-wider">Mission Control</h3>
           <button 
             onClick={() => setTraining(!training)}
             className={`w-full py-2.5 rounded-lg transition-colors text-sm font-bold uppercase tracking-wider shadow-md ${training ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
           >
             {training ? 'Pause Training' : 'Start Training'}
           </button>
        </div>

        {/* Exercise Tracker */}
        <div className="p-5 flex-1 bg-slate-800/40">
          <ExerciseTracker 
            title="Exercise: Escape the Maze" 
            description="Train the RL agent to find the green Goal while avoiding the red Traps."
            tasks={[
              { label: 'Start Training (Exploration)', completed: hasExplored, hint: 'Let the agent run for ~100 episodes' },
              { label: 'Agent discovers the Goal', completed: hasFoundGoal, hint: 'The agent will eventually stumble upon it' },
              { label: 'Agent optimizes the path', completed: isOptimized, hint: 'Watch the blue arrows (Q-values) form a direct path' }
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export default RLLab;
