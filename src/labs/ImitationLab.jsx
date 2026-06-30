import React, { useState, useRef, useCallback } from 'react';
import SimulationCanvas from '../components/SimulationCanvas';
import ExerciseTracker from '../components/ExerciseTracker';
import { NeuralNetwork } from '../utils/nn';
import { clamp } from '../utils/math';

const ImitationLab = () => {
  const [mode, setMode] = useState('human'); // 'human', 'training', 'auto'
  const [dataCount, setDataCount] = useState(0);
  const [loss, setLoss] = useState(1.0);
  
  // Exercise tracking
  const [hasCollectedData, setHasCollectedData] = useState(false);
  const [hasTrained, setHasTrained] = useState(false);

  const stateRef = useRef({
    carX: 400,
    carY: 500,
    velocity: 2,
    angle: 0,
    trackWidth: 200,
    dataset: [],
    nn: new NeuralNetwork(2, 8, 3), // 2 inputs (left_dist, right_dist), 8 hidden, 3 outputs (left, straight, right)
    trainingEpochs: 0,
    crashed: false
  });

  const keys = useRef({ ArrowLeft: false, ArrowRight: false });

  // Handle keyboard input for human driving
  const handleKeyDown = (e) => {
    if (keys.current.hasOwnProperty(e.key)) keys.current[e.key] = true;
  };
  const handleKeyUp = (e) => {
    if (keys.current.hasOwnProperty(e.key)) keys.current[e.key] = false;
  };

  const update = useCallback((dt) => {
    const state = stateRef.current;
    if (state.crashed) return;

    if (mode === 'training') {
      // Perform one epoch of training per frame
      if (state.dataset.length === 0) {
        setMode('human');
        return;
      }
      
      let totalLoss = 0;
      // Train on a random mini-batch
      for (let i = 0; i < 10; i++) {
        const sample = state.dataset[Math.floor(Math.random() * state.dataset.length)];
        const err = state.nn.train(sample.state, sample.action);
        totalLoss += err;
      }
      
      state.trainingEpochs++;
      const currentLoss = totalLoss / 10;
      setLoss(currentLoss);
      
      if (currentLoss < 0.05 || state.trainingEpochs > 500) {
        setHasTrained(true);
        setMode('auto');
        // Reset car
        state.carX = 400;
        state.angle = 0;
      }
      return;
    }

    // Physics
    const leftDist = state.carX - (400 - state.trackWidth / 2);
    const rightDist = (400 + state.trackWidth / 2) - state.carX;
    
    // Normalize state inputs
    const currentState = [leftDist / state.trackWidth, rightDist / state.trackWidth];

    let action = [0, 1, 0]; // [left, straight, right]

    if (mode === 'human') {
      if (keys.current.ArrowLeft) {
        state.angle -= 0.05;
        action = [1, 0, 0];
      } else if (keys.current.ArrowRight) {
        state.angle += 0.05;
        action = [0, 0, 1];
      }

      // Collect data periodically
      if (Math.random() < 0.2) {
        state.dataset.push({ state: currentState, action });
        setDataCount(state.dataset.length);
        if (state.dataset.length >= 100) {
          setHasCollectedData(true);
        }
      }
    } else if (mode === 'auto') {
      // Predict action
      const prediction = state.nn.predict(currentState);
      const maxIdx = prediction.indexOf(Math.max(...prediction));
      if (maxIdx === 0) state.angle -= 0.05;
      else if (maxIdx === 2) state.angle += 0.05;
    }

    // Move car
    state.carX += Math.sin(state.angle) * state.velocity * (dt * 60);
    // Simulate forward movement by just animating track (carY stays fixed)

    // Check crash
    if (state.carX < 400 - state.trackWidth / 2 + 15 || state.carX > 400 + state.trackWidth / 2 - 15) {
      state.crashed = true;
    }
  }, [mode]);

  const draw = useCallback((ctx, width, height) => {
    const state = stateRef.current;

    // Draw track
    ctx.fillStyle = '#1e293b'; // slate-800
    ctx.fillRect(400 - state.trackWidth / 2, 0, state.trackWidth, height);
    
    // Draw track borders with glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#0ea5e9';
    ctx.strokeStyle = '#0ea5e9'; // sky-500
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(400 - state.trackWidth / 2, 0); ctx.lineTo(400 - state.trackWidth / 2, height);
    ctx.moveTo(400 + state.trackWidth / 2, 0); ctx.lineTo(400 + state.trackWidth / 2, height);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw car
    ctx.save();
    ctx.translate(state.carX, state.carY);
    ctx.rotate(state.angle);
    ctx.fillStyle = state.crashed ? '#ef4444' : '#3b82f6'; // red or blue
    ctx.beginPath();
    ctx.roundRect(-15, -25, 30, 50, 4);
    ctx.fill();
    // Headlights
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(-10, -25, 3, 0, Math.PI * 2);
    ctx.arc(10, -25, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw sensor rays
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)'; // green-500
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(state.carX, state.carY);
    ctx.lineTo(400 - state.trackWidth / 2, state.carY);
    ctx.moveTo(state.carX, state.carY);
    ctx.lineTo(400 + state.trackWidth / 2, state.carY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    if (state.crashed) {
      ctx.fillStyle = 'white';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CRASHED!', 400, height / 2);
      ctx.textAlign = 'left';
    }

  }, []);

  return (
    <div 
      className="flex flex-col xl:flex-row h-full w-full bg-slate-900 overflow-y-auto xl:overflow-hidden outline-none" 
      tabIndex="0" 
      onKeyDown={handleKeyDown} 
      onKeyUp={handleKeyUp}
    >
      {/* Simulation Area */}
      <div className="flex-1 bg-slate-950 relative min-h-[50vh] xl:min-h-0 min-w-0 overflow-hidden">
        <SimulationCanvas draw={draw} update={update} width={800} height={600} className="w-full h-full object-contain" />
        
        {mode === 'human' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-800/80 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-slate-300 pointer-events-none border border-slate-700/50 animate-pulse shadow-lg whitespace-nowrap">
            Click here & use ⬅️ and ➡️ keys to steer
          </div>
        )}
      </div>

      {/* Scrollable Right Sidebar */}
      <div className="w-full xl:w-96 flex flex-col bg-slate-800/90 backdrop-blur-xl border-t xl:border-t-0 xl:border-l border-slate-700/50 overflow-y-visible xl:overflow-y-auto shrink-0 shadow-2xl z-10 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
        
        {/* Dashboard Header */}
        <div className="p-5 border-b border-slate-700/50 bg-slate-800/80">
          <h2 className="text-lg font-bold bg-gradient-to-r from-orange-400 to-indigo-400 bg-clip-text text-transparent mb-1">
            Self-Driving AI
          </h2>
          <p className="text-xs text-slate-400">
            Train a Neural Network to drive by imitating your keystrokes.
          </p>
        </div>

        {/* Live Metrics */}
        <div className="p-5 border-b border-slate-700/50 bg-slate-900/50">
          <h3 className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-wider">Training Telemetry</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700/50 shadow-inner">
              <div className="text-[10px] text-slate-500 mb-1 uppercase">Dataset Size</div>
              <div className="text-lg font-mono text-orange-400">{dataCount}</div>
            </div>
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700/50 shadow-inner">
              <div className="text-[10px] text-slate-500 mb-1 uppercase">Network Loss</div>
              <div className="text-lg font-mono text-indigo-400">{loss.toFixed(4)}</div>
            </div>
          </div>
          
          <div className="bg-slate-800 p-3 rounded-lg border border-slate-700/50 shadow-inner">
             <div className="text-[10px] text-slate-500 mb-2 uppercase">Status</div>
             <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${mode === 'human' ? 'bg-blue-500 animate-pulse' : mode === 'training' ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                <span className="text-sm font-semibold text-slate-300">
                  {mode === 'human' ? 'Awaiting Human Data...' : mode === 'training' ? 'Training Neural Net...' : 'AI Driving Engaged'}
                </span>
             </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="p-5 border-b border-slate-700/50 bg-slate-800/60 shadow-inner">
           <h3 className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-wider">Mission Control</h3>
           <div className="space-y-3">
             <button 
               onClick={() => {
                 stateRef.current.crashed = false;
                 stateRef.current.carX = 400;
                 stateRef.current.angle = 0;
                 stateRef.current.dataset = [];
                 setDataCount(0);
                 setMode('human');
               }}
               className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-sm font-semibold shadow-md"
             >
               Start Over / Collect Data
             </button>
             
             <button 
               onClick={() => setMode('training')}
               disabled={dataCount < 10}
               className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-sm font-semibold shadow-md"
             >
               Initiate Training Sequence
             </button>
           </div>
        </div>

        {/* Exercise Tracker */}
        <div className="p-5 flex-1 bg-slate-800/40">
          <ExerciseTracker 
            title="Exercise: Teach the Car" 
            description="Use the Left and Right arrow keys to keep the car on the road. The Neural Network will record your actions."
            tasks={[
              { label: 'Collect 100 data points by driving', completed: hasCollectedData, hint: `Data size: ${dataCount}/100` },
              { label: 'Train the Neural Network', completed: hasTrained, hint: mode === 'training' ? `Training Loss: ${loss.toFixed(3)}` : 'Click Train when ready' },
              { label: 'Watch it drive autonomously', completed: mode === 'auto' && !stateRef.current.crashed, hint: stateRef.current.crashed ? 'Crashed! Reset and collect better data.' : '' }
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export default ImitationLab;
