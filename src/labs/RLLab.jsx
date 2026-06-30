import React, { useState, useRef, useCallback, useEffect } from 'react';
import SimulationCanvas from '../components/SimulationCanvas';

const L1 = 100;
const L2 = 100;
const ACTIONS = [
  { d1: 10, d2: 0 },
  { d1: -10, d2: 0 },
  { d1: 0, d2: 10 },
  { d1: 0, d2: -10 }
];

const RLLab = () => {
  const [training, setTraining] = useState(false);
  const [episode, setEpisode] = useState(0);
  const [epsilon, setEpsilon] = useState(1.0);
  
  // Q-Table: [theta1][theta2][action]
  const qTable = useRef(new Float32Array(36 * 36 * 4));
  
  const stateRef = useRef({
    theta1: 45,
    theta2: 45,
    targetX: 100,
    targetY: 100,
    steps: 0,
    totalReward: 0,
    rewards: []
  });

  const getForwardKinematics = (t1, t2) => {
    const r1 = t1 * Math.PI / 180;
    const r2 = (t1 + t2) * Math.PI / 180;
    const x1 = Math.cos(r1) * L1;
    const y1 = Math.sin(r1) * L1;
    const x2 = x1 + Math.cos(r2) * L2;
    const y2 = y1 + Math.sin(r2) * L2;
    return { x1, y1, x2, y2 };
  };

  const getStateIndex = (t1, t2) => {
    const i1 = Math.floor((t1 % 360 + 360) % 360 / 10);
    const i2 = Math.floor((t2 % 360 + 360) % 360 / 10);
    return i1 * 36 + i2;
  };

  const getQ = (sIdx, aIdx) => qTable.current[sIdx * 4 + aIdx];
  const setQ = (sIdx, aIdx, val) => { qTable.current[sIdx * 4 + aIdx] = val; };

  const update = useCallback((dt) => {
    if (!training) return;
    
    // Run multiple steps per frame to speed up training visually
    for(let i=0; i<10; i++) {
      const state = stateRef.current;
      const sIdx = getStateIndex(state.theta1, state.theta2);
      
      // Epsilon greedy
      let actionIdx = 0;
      if (Math.random() < epsilon) {
        actionIdx = Math.floor(Math.random() * 4);
      } else {
        let maxQ = -Infinity;
        for(let a=0; a<4; a++) {
          const q = getQ(sIdx, a);
          if(q > maxQ) { maxQ = q; actionIdx = a; }
        }
      }

      // Take action
      const action = ACTIONS[actionIdx];
      let nt1 = state.theta1 + action.d1;
      let nt2 = state.theta2 + action.d2;
      nt1 = (nt1 + 360) % 360;
      nt2 = (nt2 + 360) % 360;

      // Observe reward
      const fk = getForwardKinematics(nt1, nt2);
      const dx = fk.x2 - state.targetX;
      const dy = fk.y2 - state.targetY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      let reward = -1; // step penalty
      let done = false;
      if (dist < 20) {
        reward = 100;
        done = true;
      }

      // Update Q
      const nsIdx = getStateIndex(nt1, nt2);
      let maxNQ = -Infinity;
      for(let a=0; a<4; a++) {
        const q = getQ(nsIdx, a);
        if(q > maxNQ) maxNQ = q;
      }
      
      const currentQ = getQ(sIdx, actionIdx);
      const alpha = 0.1;
      const gamma = 0.99;
      setQ(sIdx, actionIdx, currentQ + alpha * (reward + gamma * maxNQ - currentQ));

      state.theta1 = nt1;
      state.theta2 = nt2;
      state.totalReward += reward;
      state.steps++;

      if (done || state.steps > 200) {
        state.rewards.push(state.totalReward);
        if(state.rewards.length > 50) state.rewards.shift();
        
        state.theta1 = Math.random() * 360;
        state.theta2 = Math.random() * 360;
        state.steps = 0;
        state.totalReward = 0;
        setEpisode(e => e + 1);
        setEpsilon(e => Math.max(0.05, e * 0.995)); // Decay epsilon
      }
    }
  }, [training, epsilon]);

  const draw = useCallback((ctx, width, height) => {
    const state = stateRef.current;
    const cx = width / 2;
    const cy = height / 2;

    const { x1, y1, x2, y2 } = getForwardKinematics(state.theta1, state.theta2);

    // Draw Target
    ctx.fillStyle = '#ef4444'; // red-500
    ctx.beginPath();
    ctx.arc(cx + state.targetX, cy - state.targetY, 15, 0, Math.PI * 2);
    ctx.fill();

    // Draw Arm
    ctx.strokeStyle = '#cbd5e1'; // slate-300
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    
    // Link 1
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + x1, cy - y1);
    ctx.stroke();

    // Link 2
    ctx.strokeStyle = '#94a3b8'; // slate-400
    ctx.beginPath();
    ctx.moveTo(cx + x1, cy - y1);
    ctx.lineTo(cx + x2, cy - y2);
    ctx.stroke();

    // Joints
    ctx.fillStyle = '#334155'; // slate-700
    ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + x1, cy - y1, 8, 0, Math.PI*2); ctx.fill();
    
    // End effector
    ctx.fillStyle = '#3b82f6'; // blue-500
    ctx.beginPath(); ctx.arc(cx + x2, cy - y2, 8, 0, Math.PI*2); ctx.fill();

    // Draw Chart
    if (state.rewards.length > 0) {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const chartX = 20, chartY = height - 100, chartW = 200, chartH = 80;
      ctx.strokeRect(chartX, chartY, chartW, chartH);
      
      const maxR = Math.max(...state.rewards, 100);
      const minR = Math.min(...state.rewards, -200);
      
      state.rewards.forEach((r, i) => {
        const x = chartX + (i / 50) * chartW;
        const y = chartY + chartH - ((r - minR) / (maxR - minR)) * chartH;
        if (i===0) ctx.moveTo(x,y);
        else ctx.lineTo(x,y);
      });
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText('Reward over last 50 episodes', chartX, chartY - 5);
    }

  }, []);

  const handleCanvasClick = (e) => {
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width/2;
    const y = rect.height/2 - (e.clientY - rect.top);
    stateRef.current.targetX = x;
    stateRef.current.targetY = y;
  };

  return (
    <div className="flex h-full gap-4">
      <div className="flex-1 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden relative" onClick={handleCanvasClick}>
        <SimulationCanvas draw={draw} update={update} width={800} height={600} className="w-full h-full object-contain cursor-crosshair" />
        <div className="absolute top-4 left-4 bg-slate-800/80 p-2 rounded text-xs pointer-events-none">
          Click anywhere to move the target
        </div>
      </div>
      
      <div className="w-80 bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col gap-4">
        <h3 className="font-bold text-lg border-b border-slate-700 pb-2">Q-Learning</h3>
        
        <div className="space-y-4">
          <div className="bg-slate-900 p-3 rounded border border-slate-700">
            <div className="text-xs text-slate-400 mb-1">Episode</div>
            <div className="text-2xl font-mono text-blue-400">{episode}</div>
          </div>

          <div className="bg-slate-900 p-3 rounded border border-slate-700">
            <div className="text-xs text-slate-400 mb-1">Exploration Rate (ε)</div>
            <div className="text-2xl font-mono text-purple-400">{epsilon.toFixed(3)}</div>
          </div>

          <div className="text-sm text-slate-300">
            <p className="mb-2"><strong>State:</strong> (θ₁, θ₂)</p>
            <p className="mb-2"><strong>Actions:</strong> ±10° on each joint</p>
            <p><strong>Reward:</strong> +100 at target, -1 per step</p>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-700 flex gap-2">
          <button 
            onClick={() => setTraining(!training)}
            className={`flex-1 py-2 rounded transition-colors text-sm font-semibold ${training ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}`}
          >
            {training ? 'Pause' : 'Train Agent'}
          </button>
          <button 
            onClick={() => {
              qTable.current.fill(0);
              setEpisode(0);
              setEpsilon(1.0);
              stateRef.current.rewards = [];
            }}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors text-sm font-semibold"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

export default RLLab;
