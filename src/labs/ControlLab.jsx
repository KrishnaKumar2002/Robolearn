import React, { useState, useRef, useCallback, useEffect } from 'react';
import SimulationCanvas from '../components/SimulationCanvas';
import ExerciseTracker from '../components/ExerciseTracker';
import { clamp } from '../utils/math';

const GRAVITY = 9.81;
const MASS = 1.0;
const MAX_THRUST = 20.0;

const ControlLab = () => {
  const [kp, setKp] = useState(0.0);
  const [ki, setKi] = useState(0.0);
  const [kd, setKd] = useState(0.0);
  const [targetY, setTargetY] = useState(300);

  // Exercise states
  const [exercisePassed, setExercisePassed] = useState(false);
  const [timeAtTarget, setTimeAtTarget] = useState(0);

  const stateRef = useRef({
    y: 100,
    vy: 0,
    integral: 0,
    history: [],
    lastTimeAtTarget: 0
  });

  const update = useCallback((dt) => {
    dt = Math.min(dt, 0.05);
    const state = stateRef.current;
    
    const error = targetY - state.y;
    state.integral += error * dt;
    state.integral = clamp(state.integral, -100, 100);
    
    const derivative = -state.vy; 
    const feedforward = MASS * GRAVITY; // Gravity compensation baseline
    
    let thrust = kp * error + ki * state.integral + kd * derivative + feedforward;
    thrust = clamp(thrust, 0, MAX_THRUST);
    
    const netForce = thrust - (MASS * GRAVITY);
    const accel = netForce / MASS;
    
    state.vy += accel * dt * 10;
    state.y += state.vy * dt * 10;
    
    if (state.y <= 0) {
      state.y = 0;
      state.vy *= -0.5;
    }
    if (state.y > 600) {
      state.y = 600;
      state.vy = 0;
    }

    state.history.push({ time: performance.now(), y: state.y, target: targetY });
    if (state.history.length > 200) {
      state.history.shift();
    }

    // Check exercise condition
    if (Math.abs(error) < 5 && Math.abs(state.vy) < 2) {
      if (state.lastTimeAtTarget === 0) {
        state.lastTimeAtTarget = performance.now();
      } else {
        const timeStable = (performance.now() - state.lastTimeAtTarget) / 1000;
        setTimeAtTarget(timeStable);
        if (timeStable > 3) {
          setExercisePassed(true);
        }
      }
    } else {
      state.lastTimeAtTarget = 0;
      setTimeAtTarget(0);
    }
  }, [kp, ki, kd, targetY]);

  const draw = useCallback((ctx, width, height) => {
    const state = stateRef.current;
    const toScreenY = (y) => height - y;

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < width; i += 50) {
      ctx.moveTo(i, 0); ctx.lineTo(i, height);
    }
    for (let i = 0; i < height; i += 50) {
      ctx.moveTo(0, i); ctx.lineTo(width, i);
    }
    ctx.stroke();

    // Draw Target Line with glow
    const screenTargetY = toScreenY(targetY);
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(34, 197, 94, 0.8)';
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(0, screenTargetY);
    ctx.lineTo(width, screenTargetY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    // Draw History Trail
    if (state.history.length > 1) {
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      state.history.forEach((pt, i) => {
        const x = (i / 200) * width;
        const screenY = toScreenY(pt.y);
        if (i === 0) ctx.moveTo(x, screenY);
        else ctx.lineTo(x, screenY);
      });
      ctx.stroke();
    }

    // Draw Drone
    const droneX = width / 2;
    const droneY = toScreenY(state.y);
    
    // Body
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(droneX - 25, droneY - 8, 50, 16, 8);
    ctx.fill();
    
    // Rotors
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.roundRect(droneX - 35, droneY - 12, 20, 4, 2);
    ctx.roundRect(droneX + 15, droneY - 12, 20, 4, 2);
    ctx.fill();

    // Thrust effect
    const thrustFactor = clamp(MASS * GRAVITY + kp * (targetY - state.y) - kd * state.vy, 0, MAX_THRUST) / MAX_THRUST;
    if (thrustFactor > 0) {
      const gradient = ctx.createLinearGradient(0, droneY + 8, 0, droneY + 8 + thrustFactor * 50);
      gradient.addColorStop(0, 'rgba(56, 189, 248, 0.8)'); // sky-400
      gradient.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(droneX - 20, droneY + 8);
      ctx.lineTo(droneX + 20, droneY + 8);
      ctx.lineTo(droneX + 10, droneY + 8 + thrustFactor * 50);
      ctx.lineTo(droneX - 10, droneY + 8 + thrustFactor * 50);
      ctx.fill();
    }

  }, [targetY, kp, kd]);

  const handleCanvasClick = (e) => {
    const rect = e.target.getBoundingClientRect();
    const y = e.clientY - rect.top;
    setTargetY(600 - y);
  };

  const [metrics, setMetrics] = useState({ altitude: 0, thrust: 0, error: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      if (stateRef.current) {
        setMetrics({
          altitude: stateRef.current.y,
          thrust: stateRef.current.integral + kp * (targetY - stateRef.current.y) - kd * stateRef.current.vy,
          error: targetY - stateRef.current.y
        });
      }
    }, 100);
    return () => clearInterval(interval);
  }, [kp, kd, targetY]);

  return (
    <div className="flex flex-col xl:flex-row h-full w-full bg-slate-900 overflow-y-auto xl:overflow-hidden">
      
      {/* Simulation Area */}
      <div className="flex-1 bg-slate-950 relative min-h-[50vh] xl:min-h-0 min-w-0 overflow-hidden cursor-crosshair" onClick={handleCanvasClick}>
        <SimulationCanvas draw={draw} update={update} width={1200} height={800} className="w-full h-full object-contain" />
        <div className="absolute top-4 left-4 bg-slate-800/80 backdrop-blur-sm px-3 py-1.5 rounded-md text-xs text-slate-300 pointer-events-none border border-slate-700/50 shadow-lg">
          Click anywhere to move the target altitude
        </div>
      </div>

      {/* Dashboard Sidebar */}
      <div className="w-full xl:w-[400px] flex flex-col bg-slate-800/90 backdrop-blur-xl border-t xl:border-t-0 xl:border-l border-slate-700/50 overflow-y-visible xl:overflow-y-auto shrink-0 shadow-2xl z-10 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-700/50 bg-slate-800/80">
          <h2 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mb-1">
            PID Flight Controller
          </h2>
          <p className="text-xs text-slate-400">
            Tune the parameters to stabilize the drone's altitude. The blue line tracks the flight path.
          </p>
        </div>

        {/* Live Metrics */}
        <div className="p-5 border-b border-slate-700/50 bg-slate-900/50">
          <h3 className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-wider">Live Telemetry</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700/50 shadow-inner">
              <div className="text-[10px] text-slate-500 mb-1 uppercase">Altitude</div>
              <div className="text-lg font-mono text-blue-400">{metrics.altitude.toFixed(0)}</div>
            </div>
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700/50 shadow-inner">
              <div className="text-[10px] text-slate-500 mb-1 uppercase">Target Error</div>
              <div className="text-lg font-mono text-rose-400">{Math.abs(metrics.error).toFixed(0)}</div>
            </div>
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700/50 shadow-inner">
              <div className="text-[10px] text-slate-500 mb-1 uppercase">Thrust %</div>
              <div className="text-lg font-mono text-emerald-400">{Math.max(0, Math.min(100, (metrics.thrust / 20) * 100)).toFixed(0)}%</div>
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="p-5 border-b border-slate-700/50 bg-slate-800/60">
          <h3 className="text-xs font-semibold text-slate-300 mb-4 uppercase tracking-wider flex justify-between">
            <span>PID Parameters</span>
          </h3>
          <div className="space-y-5">
            <div>
              <label className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-200">Proportional (Kp) - Pull Power</span>
                <span className="text-blue-400 font-mono bg-blue-400/10 px-1.5 rounded">{kp.toFixed(1)}</span>
              </label>
              <input type="range" min="0" max="10" step="0.1" value={kp} onChange={e => setKp(parseFloat(e.target.value))} className="w-full accent-blue-500 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div>
              <label className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-200">Derivative (Kd) - Dampening</span>
                <span className="text-emerald-400 font-mono bg-emerald-400/10 px-1.5 rounded">{kd.toFixed(1)}</span>
              </label>
              <input type="range" min="0" max="10" step="0.1" value={kd} onChange={e => setKd(parseFloat(e.target.value))} className="w-full accent-emerald-500 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div>
              <label className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-200">Integral (Ki) - Gravity Comp</span>
                <span className="text-purple-400 font-mono bg-purple-400/10 px-1.5 rounded">{ki.toFixed(2)}</span>
              </label>
              <input type="range" min="0" max="2" step="0.01" value={ki} onChange={e => setKi(parseFloat(e.target.value))} className="w-full accent-purple-500 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
            </div>
          </div>
        </div>

        {/* Exercise Tracker */}
        <div className="p-5 flex-1 bg-slate-800/40">
          <ExerciseTracker 
            title="Exercise: Stable Hover" 
            description="Tune the PID values so the drone reaches the green target line without oscillating."
            tasks={[
              { label: 'Set Kp > 0 for spring pull', completed: kp > 0, hint: 'Start with Kp = 3.0' },
              { label: 'Set Kd > 0 to dampen oscillations', completed: kd > 0, hint: 'Start with Kd = 2.0' },
              { label: 'Hover stably for 3s', completed: exercisePassed, hint: timeAtTarget > 0 ? `Stable for ${timeAtTarget.toFixed(1)}s...` : 'Drone must stay still' }
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export default ControlLab;
