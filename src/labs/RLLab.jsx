import React, { useState, useRef, useCallback } from 'react';
import SimulationCanvas from '../components/SimulationCanvas';
import TheoryPanel from '../components/TheoryPanel';
import ExerciseTracker from '../components/ExerciseTracker';

const theorySections = [
  {
    icon: 'info',
    title: 'Reinforcement Learning',
    content: <p>Instead of being told what to do (like in Imitation Learning), an RL agent learns by <strong>Trial and Error</strong>. It explores an environment, takes actions, and receives <em>Rewards</em> or <em>Penalties</em>.</p>
  },
  {
    icon: 'lightbulb',
    title: 'The Q-Table',
    content: (
      <div className="space-y-2">
        <p>The agent maintains a "cheat sheet" called a <strong>Q-Table</strong>. For every state (grid cell) and action (up, down, left, right), it stores a "Q-value" representing the expected long-term reward.</p>
      </div>
    )
  },
  {
    icon: 'lightbulb',
    title: 'The Bellman Equation',
    content: (
      <div className="space-y-2">
        <p>When the agent moves from State A to State B and gets a reward, it updates the Q-value of State A using the Bellman Equation:</p>
        <div className="p-3 bg-slate-900 rounded font-mono text-xs text-blue-400">
          Q(s,a) = Q(s,a) + α * (Reward + γ * MaxQ(s') - Q(s,a))
        </div>
        <ul className="list-disc pl-4 text-slate-400 text-xs mt-2">
          <li><strong>α (Alpha):</strong> Learning Rate</li>
          <li><strong>γ (Gamma):</strong> Discount Factor (values future rewards)</li>
        </ul>
      </div>
    )
  },
  {
    icon: 'play',
    title: 'Exploration vs Exploitation',
    content: <p>Early on, the agent moves randomly (Exploration) to discover the map. Later, it follows the Q-Table (Exploitation) to take the best known path to the goal.</p>
  }
];

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
      <div className="w-full xl:w-96 flex flex-col bg-slate-800/90 backdrop-blur-xl border-t xl:border-t-0 xl:border-l border-slate-700/50 overflow-y-visible xl:overflow-y-auto shrink-0 shadow-2xl z-10 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
        
        {/* Controls Section */}
        <div className="p-5 border-b border-slate-700/50 bg-slate-800/60 shadow-inner">
           <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-900/80 p-3 rounded border border-slate-700/50 shadow-inner">
                <div className="text-xs text-slate-400 mb-1">Episodes</div>
                <div className="text-lg font-mono text-slate-200">{episodes}</div>
              </div>
              <div className="bg-slate-900/80 p-3 rounded border border-slate-700/50 shadow-inner">
                <div className="text-xs text-slate-400 mb-1">Exploration Rate</div>
                <div className="text-lg font-mono text-blue-400">{epsilon.toFixed(2)}</div>
              </div>
           </div>
           
           <button 
             onClick={() => setTraining(!training)}
             className={`w-full py-2.5 rounded transition-colors text-sm font-bold uppercase tracking-wider ${training ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
           >
             {training ? 'Pause Training' : 'Start Training'}
           </button>
        </div>

        {/* Exercise Tracker */}
        <div className="border-b border-slate-700/50">
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

        {/* Theory Panel */}
        <TheoryPanel 
          title="Q-Learning" 
          description="Understand how AI learns to master games and robotics by optimizing for long-term rewards."
          sections={theorySections} 
        />
      </div>
    </div>
  );
};

export default RLLab;
