import React, { useState, useRef, useCallback, useEffect } from 'react';
import SimulationCanvas from '../components/SimulationCanvas';
import TheoryPanel from '../components/TheoryPanel';
import ExerciseTracker from '../components/ExerciseTracker';
import { clamp } from '../utils/math';

const GRAVITY = 9.81;
const MASS = 1.0;
const MAX_THRUST = 20.0;

const theorySections = [
  {
    icon: 'info',
    title: 'The Goal: Hovering',
    content: <p>A drone needs to dynamically adjust its thrust to counteract gravity and hover at a target altitude. Because real-world environments are noisy, we use a <strong>PID Controller</strong> to smoothly reach the target.</p>
  },
  {
    icon: 'lightbulb',
    title: 'P: Proportional',
    content: (
      <div className="space-y-2">
        <p>The <strong>Proportional</strong> term acts like a spring. The further you are from the target, the harder it pulls you back.</p>
        <div className="p-3 bg-slate-900 rounded font-mono text-xs text-blue-400">
          Thrust += Kp * (Target - Current)
        </div>
        <p><em>Caveat:</em> If Kp is too high, the drone will overshoot and oscillate wildly!</p>
      </div>
    )
  },
  {
    icon: 'lightbulb',
    title: 'D: Derivative',
    content: (
      <div className="space-y-2">
        <p>The <strong>Derivative</strong> term acts like a shock absorber. It predicts the future by looking at your current velocity and slows you down as you approach the target to prevent overshooting.</p>
        <div className="p-3 bg-slate-900 rounded font-mono text-xs text-emerald-400">
          Thrust += Kd * (-Velocity)
        </div>
      </div>
    )
  },
  {
    icon: 'lightbulb',
    title: 'I: Integral',
    content: (
      <div className="space-y-2">
        <p>The <strong>Integral</strong> term accumulates past errors. If the drone is slightly too heavy (e.g. wind or unmodeled weight) and hovers just below the target, the Integral term builds up over time to give it that extra push.</p>
        <div className="p-3 bg-slate-900 rounded font-mono text-xs text-purple-400">
          ErrorSum += (Target - Current) * dt<br/>
          Thrust += Ki * ErrorSum
        </div>
      </div>
    )
  }
];

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

  return (
    <div className="flex h-full w-full bg-slate-900 overflow-hidden">
      
      {/* Simulation Area */}
      <div className="flex-1 flex flex-col p-6 gap-6">
        
        {/* Top bar with Exercise & Controls */}
        <div className="grid grid-cols-2 gap-6 h-64 shrink-0">
          <ExerciseTracker 
            title="Exercise: Stable Hover" 
            description="Tune the PID values so the drone reaches the green target line without oscillating out of control."
            tasks={[
              { label: 'Set Kp > 0 to enable spring-like pull', completed: kp > 0, hint: 'Start with Kp = 3.0' },
              { label: 'Set Kd > 0 to dampen the oscillations', completed: kd > 0, hint: 'Start with Kd = 2.0' },
              { label: 'Hover stably at the target for 3 seconds', completed: exercisePassed, hint: timeAtTarget > 0 ? `Stable for ${timeAtTarget.toFixed(1)}s...` : 'Drone must stay still at the target' }
            ]}
          />

          <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-xl p-5 shadow-lg flex flex-col justify-center">
            <div className="space-y-5">
              <div>
                <label className="flex justify-between text-sm mb-2">
                  <span className="font-semibold text-slate-200">Proportional (Kp)</span>
                  <span className="text-blue-400 font-mono bg-blue-400/10 px-2 py-0.5 rounded">{kp.toFixed(1)}</span>
                </label>
                <input type="range" min="0" max="10" step="0.1" value={kp} onChange={e => setKp(parseFloat(e.target.value))} className="w-full accent-blue-500" />
              </div>
              <div>
                <label className="flex justify-between text-sm mb-2">
                  <span className="font-semibold text-slate-200">Derivative (Kd)</span>
                  <span className="text-emerald-400 font-mono bg-emerald-400/10 px-2 py-0.5 rounded">{kd.toFixed(1)}</span>
                </label>
                <input type="range" min="0" max="10" step="0.1" value={kd} onChange={e => setKd(parseFloat(e.target.value))} className="w-full accent-emerald-500" />
              </div>
              <div>
                <label className="flex justify-between text-sm mb-2">
                  <span className="font-semibold text-slate-200">Integral (Ki)</span>
                  <span className="text-purple-400 font-mono bg-purple-400/10 px-2 py-0.5 rounded">{ki.toFixed(2)}</span>
                </label>
                <input type="range" min="0" max="2" step="0.01" value={ki} onChange={e => setKi(parseFloat(e.target.value))} className="w-full accent-purple-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 bg-slate-950 border border-slate-700/50 rounded-xl overflow-hidden relative shadow-inner cursor-crosshair" onClick={handleCanvasClick}>
          <SimulationCanvas draw={draw} update={update} width={1200} height={600} className="w-full h-full object-cover" />
          <div className="absolute top-4 left-4 bg-slate-800/80 backdrop-blur-sm px-3 py-1.5 rounded-md text-xs text-slate-300 pointer-events-none border border-slate-700/50">
            Click anywhere to move the target altitude
          </div>
        </div>
      </div>

      {/* Theory Panel */}
      <TheoryPanel 
        title="PID Control" 
        description="Learn how autonomous robots maintain stability and reach their targets smoothly without crashing."
        sections={theorySections} 
      />
    </div>
  );
};

export default ControlLab;
