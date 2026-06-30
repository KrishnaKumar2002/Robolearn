import React, { useState, useRef, useCallback, useEffect } from 'react';
import SimulationCanvas from '../components/SimulationCanvas';
import { NeuralNetwork } from '../utils/nn';

// Actions: 0 = straight, 1 = left, 2 = right
const ImitationLab = () => {
  const [mode, setMode] = useState('human'); // human, training, auto
  const [datasetSize, setDatasetSize] = useState(0);
  const [loss, setLoss] = useState(0);
  
  const stateRef = useRef({
    x: 400, y: 300, angle: 0, velocity: 0,
    sensors: [0, 0, 0], // left, front, right
    keys: { ArrowUp: false, ArrowLeft: false, ArrowRight: false },
    dataset: [], // { state: [..], action: [0,0,1] }
    nn: new NeuralNetwork(3, 16, 3),
    track: [
      { x: 200, y: 150, r: 100 },
      { x: 600, y: 150, r: 100 },
      { x: 600, y: 450, r: 100 },
      { x: 200, y: 450, r: 100 }
    ] // track nodes
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if(stateRef.current.keys.hasOwnProperty(e.code)) stateRef.current.keys[e.code] = true;
    };
    const handleKeyUp = (e) => {
      if(stateRef.current.keys.hasOwnProperty(e.code)) stateRef.current.keys[e.code] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const getDistanceToTrackEdge = (x, y, dx, dy) => {
    const state = stateRef.current;
    let minD = 200; // max distance
    for(let i=0; i<minD; i+=5) {
      const px = x + dx * i;
      const py = y + dy * i;
      // check if px, py is inside track
      // track is defined roughly as a thick line connecting nodes
      let onTrack = false;
      for(let j=0; j<state.track.length; j++) {
        const next = state.track[(j+1)%state.track.length];
        const curr = state.track[j];
        
        // distance to line segment
        const l2 = (next.x - curr.x)**2 + (next.y - curr.y)**2;
        let t = ((px - curr.x) * (next.x - curr.x) + (py - curr.y) * (next.y - curr.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        const projX = curr.x + t * (next.x - curr.x);
        const projY = curr.y + t * (next.y - curr.y);
        const distToCenter = Math.sqrt((px - projX)**2 + (py - projY)**2);
        
        if (distToCenter < 60) {
          onTrack = true;
          break;
        }
      }
      if(!onTrack) return i;
    }
    return minD;
  };

  const update = useCallback((dt) => {
    dt = Math.min(dt, 0.05);
    const state = stateRef.current;

    // Simulate sensors (angles: -45, 0, 45)
    const angles = [-Math.PI/4, 0, Math.PI/4];
    for(let i=0; i<3; i++) {
      const a = state.angle + angles[i];
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      state.sensors[i] = getDistanceToTrackEdge(state.x, state.y, dx, dy) / 200.0;
    }

    let turn = 0;
    let throttle = 0;

    if (mode === 'human') {
      if (state.keys.ArrowUp) throttle = 1;
      if (state.keys.ArrowLeft) turn = -1;
      if (state.keys.ArrowRight) turn = 1;

      // Record data if moving
      if (throttle > 0 && Math.random() < 0.2) { // sample rate
        let action = [1, 0, 0]; // straight
        if (turn < 0) action = [0, 1, 0]; // left
        if (turn > 0) action = [0, 0, 1]; // right
        state.dataset.push({ state: [...state.sensors], action });
        setDatasetSize(state.dataset.length);
      }
    } else if (mode === 'auto') {
      throttle = 1; // always drive
      const probs = state.nn.predict(state.sensors);
      // argmax
      let maxI = 0;
      for(let i=1; i<3; i++) if(probs[i] > probs[maxI]) maxI = i;
      if (maxI === 1) turn = -1;
      if (maxI === 2) turn = 1;
    }

    state.velocity += (throttle * 150 - state.velocity) * 2 * dt;
    state.angle += turn * 3 * dt;
    
    state.x += Math.cos(state.angle) * state.velocity * dt;
    state.y += Math.sin(state.angle) * state.velocity * dt;

    // reset if out of bounds deeply
    if(state.x < 0 || state.x > 800 || state.y < 0 || state.y > 600) {
      state.x = 400; state.y = 300; state.angle = 0;
    }
  }, [mode]);

  const draw = useCallback((ctx, width, height) => {
    const state = stateRef.current;

    // Draw track
    ctx.lineWidth = 120;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#334155'; // track color
    ctx.beginPath();
    state.track.forEach((t, i) => {
      if(i===0) ctx.moveTo(t.x, t.y);
      else ctx.lineTo(t.x, t.y);
    });
    ctx.closePath();
    ctx.stroke();

    // Draw center line
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#f8fafc';
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    state.track.forEach((t, i) => {
      if(i===0) ctx.moveTo(t.x, t.y);
      else ctx.lineTo(t.x, t.y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw sensors
    const angles = [-Math.PI/4, 0, Math.PI/4];
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
    ctx.lineWidth = 1;
    for(let i=0; i<3; i++) {
      const a = state.angle + angles[i];
      const d = state.sensors[i] * 200;
      ctx.beginPath();
      ctx.moveTo(state.x, state.y);
      ctx.lineTo(state.x + Math.cos(a)*d, state.y + Math.sin(a)*d);
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(state.x + Math.cos(a)*d, state.y + Math.sin(a)*d, 3, 0, Math.PI*2);
      ctx.fill();
    }

    // Draw car
    ctx.translate(state.x, state.y);
    ctx.rotate(state.angle);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(-10, -6, 20, 12);
    ctx.fillStyle = '#94a3b8'; // windshield
    ctx.fillRect(2, -5, 4, 10);
    ctx.rotate(-state.angle);
    ctx.translate(-state.x, -state.y);

  }, []);

  const handleTrain = () => {
    setMode('training');
    const state = stateRef.current;
    if(state.dataset.length === 0) return setMode('human');

    let iter = 0;
    const interval = setInterval(() => {
      let epochLoss = 0;
      for(let i=0; i<50; i++) {
        const sample = state.dataset[Math.floor(Math.random() * state.dataset.length)];
        state.nn.train(sample.state, sample.action);
        
        // calc approx loss for display
        const p = state.nn.predict(sample.state);
        epochLoss += sample.action.reduce((sum, a, idx) => sum + Math.abs(a - p[idx]), 0);
      }
      setLoss(epochLoss / 50);
      
      iter++;
      if(iter > 100) {
        clearInterval(interval);
        setMode('auto');
        // Reset car
        state.x = 200; state.y = 150; state.angle = 0; state.velocity = 0;
      }
    }, 20);
  };

  return (
    <div className="flex h-full gap-4">
      <div className="flex-1 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden relative">
        <SimulationCanvas draw={draw} update={update} width={800} height={600} className="w-full h-full object-contain" />
        <div className="absolute top-4 left-4 bg-slate-800/80 p-2 rounded text-xs pointer-events-none text-slate-300">
          Mode: <span className="text-white font-bold uppercase">{mode}</span>
        </div>
      </div>
      
      <div className="w-80 bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col gap-4">
        <h3 className="font-bold text-lg border-b border-slate-700 pb-2">Learning from Demonstration</h3>
        
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            1. Drive the car using <kbd className="bg-slate-700 p-1 rounded">↑</kbd> <kbd className="bg-slate-700 p-1 rounded">←</kbd> <kbd className="bg-slate-700 p-1 rounded">→</kbd> to collect training data.<br/>
            2. Click Train to train a Neural Network.<br/>
            3. Watch it drive autonomously!
          </p>

          <div className="bg-slate-900 p-3 rounded border border-slate-700">
            <div className="text-xs text-slate-400 mb-1">Collected Data Points</div>
            <div className="text-2xl font-mono text-blue-400">{datasetSize}</div>
          </div>

          <div className="bg-slate-900 p-3 rounded border border-slate-700">
            <div className="text-xs text-slate-400 mb-1">Training Loss</div>
            <div className="text-2xl font-mono text-red-400">{loss.toFixed(4)}</div>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-700 flex flex-col gap-2">
          {mode === 'human' && (
            <button 
              onClick={handleTrain}
              className="w-full py-2 bg-green-600 hover:bg-green-500 rounded transition-colors text-sm font-semibold"
            >
              Train Network
            </button>
          )}
          {mode === 'training' && (
            <button disabled className="w-full py-2 bg-yellow-600 rounded text-sm font-semibold opacity-50 cursor-not-allowed">
              Training in progress...
            </button>
          )}
          {mode === 'auto' && (
            <button 
              onClick={() => {
                setMode('human');
                stateRef.current.dataset = [];
                setDatasetSize(0);
                setLoss(0);
                stateRef.current.nn = new NeuralNetwork(3, 16, 3);
              }}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded transition-colors text-sm font-semibold"
            >
              Reset & Collect New Data
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImitationLab;
