import React, { useRef, useEffect } from 'react';

const SimulationCanvas = ({ draw, update, width = 800, height = 600, ...rest }) => {
  const canvasRef = useRef(null);
  const requestRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let lastTime = performance.now();

    const animate = time => {
      const deltaTime = (time - lastTime) / 1000; // in seconds
      lastTime = time;

      if (update) update(deltaTime);
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      // Fill background
      ctx.fillStyle = '#1e293b'; // slate-800
      ctx.fillRect(0, 0, width, height);

      if (draw) draw(ctx, width, height);
      
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [draw, update, width, height]);

  return (
    <canvas 
      ref={canvasRef} 
      width={width} 
      height={height} 
      className="max-w-full max-h-full rounded-lg shadow-inner bg-slate-800"
      {...rest}
    />
  );
};

export default SimulationCanvas;
