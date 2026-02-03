
import React, { useEffect, useRef } from 'react';

interface WaveformVisualizerProps {
  isActive: boolean;
  color?: string;
}

const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({ isActive, color = '#64748b' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let offset = 0;

    const render = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      
      if (!isActive) {
        // Flat line when inactive
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        return;
      }

      // Sine wave animation when active
      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = color;
      ctx.lineCap = 'round';

      for (let x = 0; x < width; x++) {
        const angle = (x / width) * Math.PI * 4 + offset;
        const amplitude = isActive ? Math.sin(offset * 2) * 20 + 30 : 5;
        const y = height / 2 + Math.sin(angle) * amplitude;
        
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      
      ctx.stroke();
      offset += 0.1;
      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [isActive, color]);

  return (
    <canvas 
      ref={canvasRef} 
      width={400} 
      height={120} 
      className="w-full max-w-md h-24 opacity-80"
    />
  );
};

export default WaveformVisualizer;
