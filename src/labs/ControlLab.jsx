import React, { useState, useRef, useCallback } from 'react';
import SimulationCanvas from '../components/SimulationCanvas';
import { clamp } from '../utils/math';

const GRAVITY = 9.81;
const MASS = 1.0;
const MAX_THRUST = 20.0;

const ControlLab = () => {
  const [kp, setKp] = useState(5.0);
  const [ki, setKi] = useState(0.5);
  const [kd, setKd] = useState(3.0);
  const [targetY, setTargetY] = useState(300);

  const stateRef = useRef({
    y: 100, // starting altitude (pixels)
    vy: 0,
    integral: 0,
    history: []
  });

  const update = useCallback((dt) => {
    // Limit dt to avoid explosions on lag
    dt = Math.min(dt, 0.05);
    const state = stateRef.current;
    
    // PID Control
    const error = targetY - state.y;
    state.integral += error * dt;
    
    // Ant-windup
    state.integral = clamp(state.integral, -100, 100);
    
    // derivative using velocity instead of error diff to avoid derivative kick
    const derivative = -state.vy; 
    
    // Feedforward gravity
    const feedforward = MASS * GRAVITY;
    
    let thrust = kp * error + ki * state.integral + kd * derivative + feedforward;
    thrust = clamp(thrust, 0, MAX_THRUST);
    
    // Physics update
    const netForce = thrust - (MASS * GRAVITY);
    const accel = netForce / MASS;
    
    state.vy += accel * dt * 10; // *10 scales physics up for visual speed
    state.y += state.vy * dt * 10;
    
    // Ground collision
    if (state.y <= 0) {
      state.y = 0;
      state.vy *= -0.5; // bounce
    }
    // Ceiling collision
    if (state.y > 600) {
      state.y = 600;
      state.vy = 0;
    }

    // Keep history for trails
    state.history.push({ time: performance.now(), y: state.y, target: targetY });
    if (state.history.length > 200) {
      state.history.shift();
    }
  }, [kp, ki, kd, targetY]);

  const draw = useCallback((ctx, width, height) => {
    const state = stateRef.current;
    
    // The canvas origin is top-left, but we want Y=0 to be the bottom.
    // So visualY = height - physicalY
    const toScreenY = (y) => height - y;

    // Draw Target Line
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)'; // green-500
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, toScreenY(targetY));
    ctx.lineTo(width, toScreenY(targetY));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#22c55e';
    ctx.font = '12px sans-serif';
    ctx.fillText(`Target: ${targetY}`, 10, toScreenY(targetY) - 10);

    // Draw History Trail
    if (state.history.length > 1) {
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.3)'; // blue-400
      ctx.lineWidth = 2;
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
    
    // Drone body
    ctx.fillStyle = '#cbd5e1'; // slate-300
    ctx.beginPath();
    ctx.roundRect(droneX - 20, droneY - 10, 40, 20, 4);
    ctx.fill();
    
    // Rotors
    ctx.fillStyle = '#94a3b8'; // slate-400
    ctx.fillRect(droneX - 25, droneY - 15, 15, 5);
    ctx.fillRect(droneX + 10, droneY - 15, 15, 5);

    // Thrust effect
    const thrustFactor = clamp(MASS * GRAVITY + kp * (targetY - state.y) - kd * state.vy, 0, MAX_THRUST) / MAX_THRUST;
    if (thrustFactor > 0) {
      ctx.fillStyle = `rgba(249, 115, 22, ${thrustFactor})`; // orange-500
      ctx.beginPath();
      ctx.moveTo(droneX - 10, droneY + 10);
      ctx.lineTo(droneX + 10, droneY + 10);
      ctx.lineTo(droneX, droneY + 10 + thrustFactor * 30);
      ctx.fill();
    }

    // Data text
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`Alt: ${state.y.toFixed(1)}`, droneX + 30, droneY);
    ctx.fillText(`Vel: ${state.vy.toFixed(1)}`, droneX + 30, droneY + 15);
  }, [targetY]);

  // Click on canvas to change target
  const handleCanvasClick = (e) => {
    const rect = e.target.getBoundingClientRect();
    const y = e.clientY - rect.top;
    setTargetY(600 - y); // Invert back from screen space (assuming height=600)
  };

  return (
    <div className="flex h-full gap-4">
      <div className="flex-1 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden relative" onClick={handleCanvasClick}>
        <SimulationCanvas draw={draw} update={update} width={800} height={600} className="w-full h-full object-contain cursor-crosshair" />
        <div className="absolute top-4 left-4 bg-slate-800/80 p-2 rounded text-xs pointer-events-none">
          Click anywhere to set target altitude
        </div>
      </div>
      
      <div className="w-80 bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col gap-4">
        <h3 className="font-bold text-lg border-b border-slate-700 pb-2">PID Controller</h3>
        
        <div className="space-y-4">
          <div>
            <label className="flex justify-between text-sm mb-1">
              <span>Proportional (Kp)</span>
              <span className="text-blue-400 font-mono">{kp.toFixed(1)}</span>
            </label>
            <input type="range" min="0" max="20" step="0.1" value={kp} onChange={e => setKp(parseFloat(e.target.value))} className="w-full accent-blue-500" />
            <p className="text-xs text-slate-400 mt-1">Reacts to immediate error.</p>
          </div>

          <div>
            <label className="flex justify-between text-sm mb-1">
              <span>Integral (Ki)</span>
              <span className="text-purple-400 font-mono">{ki.toFixed(2)}</span>
            </label>
            <input type="range" min="0" max="5" step="0.01" value={ki} onChange={e => setKi(parseFloat(e.target.value))} className="w-full accent-purple-500" />
            <p className="text-xs text-slate-400 mt-1">Eliminates steady-state error.</p>
          </div>

          <div>
            <label className="flex justify-between text-sm mb-1">
              <span>Derivative (Kd)</span>
              <span className="text-emerald-400 font-mono">{kd.toFixed(1)}</span>
            </label>
            <input type="range" min="0" max="10" step="0.1" value={kd} onChange={e => setKd(parseFloat(e.target.value))} className="w-full accent-emerald-500" />
            <p className="text-xs text-slate-400 mt-1">Dampens oscillations.</p>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-700">
          <button 
            onClick={() => {
              stateRef.current.y = 0;
              stateRef.current.vy = 0;
              stateRef.current.integral = 0;
              stateRef.current.history = [];
              setTargetY(300);
            }}
            className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors text-sm font-semibold"
          >
            Reset Simulation
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControlLab;
