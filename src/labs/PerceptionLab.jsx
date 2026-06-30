import React, { useState, useRef, useCallback, useEffect } from 'react';
import SimulationCanvas from '../components/SimulationCanvas';
import ExerciseTracker from '../components/ExerciseTracker';

// Generate some dummy "objects" for the camera feed
const createDummyObjects = () => [
  { id: 1, type: 'car', x: Math.random() * 800, y: Math.random() * 600, vx: 1 + Math.random(), vy: 0, color: '#ef4444', size: 40, baseConfidence: 0.95 },
  { id: 2, type: 'pedestrian', x: Math.random() * 800, y: Math.random() * 600, vx: 0, vy: -0.5 - Math.random(), color: '#f59e0b', size: 15, baseConfidence: 0.82 },
  { id: 3, type: 'car', x: Math.random() * 800, y: Math.random() * 600, vx: -1.5, vy: 0, color: '#3b82f6', size: 45, baseConfidence: 0.88 },
  { id: 4, type: 'bicycle', x: Math.random() * 800, y: Math.random() * 600, vx: 2, vy: 0.5, color: '#10b981', size: 20, baseConfidence: 0.65 },
  { id: 5, type: 'tree (noise)', x: Math.random() * 800, y: Math.random() * 600, vx: 0, vy: 0, color: '#22c55e', size: 30, baseConfidence: 0.35 },
  { id: 6, type: 'shadow (noise)', x: Math.random() * 800, y: Math.random() * 600, vx: 0.1, vy: 0, color: '#334155', size: 50, baseConfidence: 0.25 },
];

const PerceptionLab = () => {
  const [threshold, setThreshold] = useState(0.5);
  const [detections, setDetections] = useState([]);
  const [exercisePassed, setExercisePassed] = useState(false);

  const stateRef = useRef({
    objects: createDummyObjects()
  });

  const update = useCallback((dt) => {
    const state = stateRef.current;
    
    // Move objects
    state.objects.forEach(obj => {
      obj.x += obj.vx * (dt * 60);
      obj.y += obj.vy * (dt * 60);
      
      // Wrap around
      if (obj.x > 850) obj.x = -50;
      if (obj.x < -50) obj.x = 850;
      if (obj.y > 650) obj.y = -50;
      if (obj.y < -50) obj.y = 650;
      
      // Add a little noise to confidence
      obj.currentConfidence = Math.max(0, Math.min(1, obj.baseConfidence + (Math.random() - 0.5) * 0.1));
    });

    // Run "Detection" (filter by threshold)
    const validDetections = state.objects.filter(obj => obj.currentConfidence >= threshold);
    
    // Only update React state occasionally to avoid lag
    if (Math.random() < 0.1) {
      setDetections([...validDetections]);
      
      // Exercise: Tune threshold to detect cars/pedestrians but filter out noise
      const hasNoise = validDetections.some(d => d.type.includes('noise'));
      const hasValid = validDetections.some(d => !d.type.includes('noise'));
      
      if (!hasNoise && hasValid && threshold > 0.4 && threshold < 0.8) {
        setExercisePassed(true);
      }
    }
  }, [threshold]);

  const draw = useCallback((ctx, width, height) => {
    const state = stateRef.current;

    // Draw background (road/environment)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    // Draw road lines
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 4;
    ctx.setLineDash([20, 20]);
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw raw objects
    state.objects.forEach(obj => {
      ctx.fillStyle = obj.color;
      ctx.beginPath();
      if (obj.type.includes('car') || obj.type.includes('noise')) {
        ctx.fillRect(obj.x - obj.size, obj.y - obj.size/2, obj.size*2, obj.size);
      } else {
        ctx.arc(obj.x, obj.y, obj.size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // If detected (confidence >= threshold), draw Bounding Box
      if (obj.currentConfidence >= threshold) {
        ctx.strokeStyle = '#22c55e'; // Green bounding box
        ctx.lineWidth = 2;
        const pad = 10;
        ctx.strokeRect(obj.x - obj.size - pad, obj.y - obj.size - pad, obj.size*2 + pad*2, obj.size*2 + pad*2);
        
        // Draw label
        ctx.fillStyle = '#22c55e';
        ctx.font = '12px monospace';
        ctx.fillText(`${obj.type} ${(obj.currentConfidence * 100).toFixed(0)}%`, obj.x - obj.size - pad, obj.y - obj.size - pad - 5);
      }
    });

    // Draw crosshair overlay
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width/2, 0); ctx.lineTo(width/2, height);
    ctx.moveTo(0, height/2); ctx.lineTo(width, height/2);
    ctx.stroke();

  }, [threshold]);

  return (
    <div className="flex flex-col xl:flex-row h-full w-full bg-slate-900 overflow-y-auto xl:overflow-hidden">
      
      {/* Simulation Area */}
      <div className="flex-1 bg-slate-950 relative min-h-[50vh] xl:min-h-0 min-w-0 overflow-hidden">
        <SimulationCanvas draw={draw} update={update} width={800} height={600} className="w-full h-full object-contain" />
        
        <div className="absolute top-4 left-4 bg-slate-800/80 backdrop-blur-sm px-3 py-1.5 rounded-md text-xs text-emerald-400 font-mono pointer-events-none border border-slate-700/50 shadow-lg flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span>CAMERA_FEED_LIVE // THRESHOLD: {threshold.toFixed(2)}</span>
        </div>
      </div>

      {/* Dashboard Sidebar */}
      <div className="w-full xl:w-[400px] flex flex-col bg-slate-800/90 backdrop-blur-xl border-t xl:border-t-0 xl:border-l border-slate-700/50 overflow-y-visible xl:overflow-y-auto shrink-0 shadow-2xl z-10 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-700/50 bg-slate-800/80">
          <h2 className="text-lg font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent mb-1">
            Perception AI
          </h2>
          <p className="text-xs text-slate-400">
            Tune the computer vision confidence threshold to detect objects without triggering false positives.
          </p>
        </div>

        {/* Live Metrics */}
        <div className="p-5 border-b border-slate-700/50 bg-slate-900/50">
          <h3 className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-wider">Live Detections</h3>
          
          <div className="bg-slate-800 rounded-lg border border-slate-700/50 shadow-inner overflow-hidden max-h-48 overflow-y-auto scrollbar-thin">
            {detections.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">No objects detected.</div>
            ) : (
              <ul className="divide-y divide-slate-700/50">
                {detections.map(d => (
                  <li key={d.id} className="p-2.5 flex justify-between items-center text-xs">
                    <span className="font-mono text-slate-300 capitalize flex items-center">
                      <span className={`w-2 h-2 rounded-full mr-2 ${d.type.includes('noise') ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                      {d.type}
                    </span>
                    <span className={`font-mono ${d.type.includes('noise') ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {(d.currentConfidence * 100).toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Controls Section */}
        <div className="p-5 border-b border-slate-700/50 bg-slate-800/60">
          <h3 className="text-xs font-semibold text-slate-300 mb-4 uppercase tracking-wider flex justify-between">
            <span>Detection Settings</span>
          </h3>
          <div className="space-y-5">
            <div>
              <label className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-200">Confidence Threshold</span>
                <span className="text-teal-400 font-mono bg-teal-400/10 px-1.5 rounded">{(threshold * 100).toFixed(0)}%</span>
              </label>
              <input 
                type="range" min="0" max="1" step="0.01" 
                value={threshold} 
                onChange={e => setThreshold(parseFloat(e.target.value))} 
                className="w-full accent-teal-500 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer" 
              />
              <p className="text-[10px] text-slate-500 mt-2">
                Lower = More detections (but more false positives).<br/>
                Higher = Fewer detections (but more false negatives).
              </p>
            </div>
          </div>
        </div>

        {/* Exercise Tracker */}
        <div className="p-5 flex-1 bg-slate-800/40">
          <ExerciseTracker 
            title="Exercise: Filter the Noise" 
            description="The AI is seeing 'shadows' and 'trees' as moving objects. Adjust the threshold so it only detects real vehicles and pedestrians."
            tasks={[
              { label: 'Set threshold high enough to ignore noise', completed: !detections.some(d => d.type.includes('noise')), hint: 'Noise confidence is around 25-35%' },
              { label: 'Set threshold low enough to keep real objects', completed: detections.some(d => !d.type.includes('noise')), hint: 'Real objects are >65%' },
              { label: 'Find the sweet spot', completed: exercisePassed, hint: 'Balance precision and recall' }
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export default PerceptionLab;
