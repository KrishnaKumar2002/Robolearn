import React, { useRef, useEffect } from 'react';

const LiveGraph = ({ data, targetData, min = 0, max = 600, label = 'Value', color = '#3b82f6', targetColor = '#22c55e' }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw Grid
    ctx.strokeStyle = '#334155'; // slate-700
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    const drawLine = (pts, strokeColor, isDashed = false) => {
      if (!pts || pts.length < 2) return;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.setLineDash(isDashed ? [5, 5] : []);
      ctx.beginPath();
      
      const stepX = width / Math.max(pts.length - 1, 100); // show last 100 points
      const startIdx = Math.max(0, pts.length - 100);
      
      for (let i = startIdx; i < pts.length; i++) {
        const val = pts[i];
        const normalizedVal = Math.max(0, Math.min(1, (val - min) / (max - min)));
        const x = (i - startIdx) * stepX;
        const y = height - (normalizedVal * height);
        
        if (i === startIdx) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };

    drawLine(targetData, targetColor, true);
    drawLine(data, color, false);

  }, [data, targetData, min, max, color, targetColor]);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{label}</div>
      <div className="flex-1 bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
        <canvas ref={canvasRef} width={400} height={150} className="w-full h-full object-fill" />
      </div>
    </div>
  );
};

export default LiveGraph;
