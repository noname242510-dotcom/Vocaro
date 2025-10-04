
"use client";

import { useState, useEffect } from 'react';

const ConfettiPiece = ({ id, onComplete }: { id: number; onComplete: (id: number) => void }) => {
  const [style, setStyle] = useState({});

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    
    const randomXStart = Math.random() * 100;
    const randomXEnd = randomXStart - 20 + Math.random() * 40;
    const randomYEnd = '120vh'; 
    const randomDelay = Math.random() * 2;
    const randomDuration = 2 + Math.random() * 2;
    const randomRotationStart = Math.random() * 360;
    const randomRotationEnd = randomRotationStart + 720 + Math.random() * 720;
    const randomSize = 6 + Math.random() * 8;
    const colors = [isDarkMode ? '#fff' : '#000'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    setStyle({
      '--x-start': `${randomXStart}vw`,
      '--x-end': `${randomXEnd}vw`,
      '--y-end': randomYEnd,
      '--delay': `${randomDelay}s`,
      '--duration': `${randomDuration}s`,
      '--rotation-start': `${randomRotationStart}deg`,
      '--rotation-end': `${randomRotationEnd}deg`,
      width: `${randomSize}px`,
      height: `${randomSize}px`,
      backgroundColor: randomColor,
      top: '-20px', 
      left: `var(--x-start)`,
      animation: `fall var(--duration) linear var(--delay) forwards`,
    });
    
    const timer = setTimeout(() => {
        onComplete(id);
    }, (randomDelay + randomDuration) * 1000);

    return () => clearTimeout(timer);
  }, [id, onComplete]);

  return (
    <div
      className="absolute rounded-full"
      style={style}
    />
  );
};

export const Confetti = ({ active }: { active: boolean }) => {
    const [pieces, setPieces] = useState<number[]>([]);
  
    useEffect(() => {
      if (active) {
        setPieces(Array.from({ length: 150 }, (_, i) => i + Date.now()));
      }
    }, [active]);
  
    const handleComplete = (id: number) => {
      setPieces((prev) => prev.filter((pId) => pId !== id));
    };
  
    if (!active && pieces.length === 0) return null;
  
    return (
      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
        {pieces.map((id) => (
          <ConfettiPiece key={id} id={id} onComplete={handleComplete} />
        ))}
      </div>
    );
};
