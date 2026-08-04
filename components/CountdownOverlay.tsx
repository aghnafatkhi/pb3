'use client';

import React, { useEffect, useState } from 'react';
import { sounds } from '@/lib/audio';
import { Sparkles, Camera } from 'lucide-react';

interface CountdownOverlayProps {
  countdownStartTime: number; // Timestamp when 3-2-1 countdown started
  onCountdownComplete: () => void;
}

export function CountdownOverlay({ countdownStartTime, onCountdownComplete }: CountdownOverlayProps) {
  const [count, setCount] = useState<number | string>(3);
  const [isFlash, setIsFlash] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const tick = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - countdownStartTime) / 1000);
      const remaining = 3 - elapsed;

      if (remaining === 3) {
        setCount(3);
        sounds.playBeep(440);
      } else if (remaining === 2) {
        setCount(2);
        sounds.playBeep(523.25);
      } else if (remaining === 1) {
        setCount(1);
        sounds.playBeep(659.25);
      } else if (remaining <= 0) {
        setCount('CHEESE! 📸');
        sounds.playBeep(880);
        sounds.playShutter();
        setIsFlash(true);

        setTimeout(() => {
          onCountdownComplete();
        }, 500);
        return;
      }

      timer = setTimeout(tick, 200);
    };

    tick();

    return () => clearTimeout(timer);
  }, [countdownStartTime, onCountdownComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
      {/* Screen Flash Animation */}
      {isFlash && <div className="fixed inset-0 bg-white z-50 flash-overlay pointer-events-none" />}

      <div className="flex flex-col items-center justify-center text-center p-6 text-white">
        <div className="relative flex items-center justify-center">
          {/* Pulsing ring background */}
          <div className="absolute w-44 h-44 sm:w-56 sm:h-56 bg-rose-500/20 rounded-full animate-ping pointer-events-none" />
          <div className="absolute w-36 h-36 sm:w-44 sm:h-44 bg-rose-400/30 rounded-full pulse-glow pointer-events-none" />

          {/* Countdown display */}
          <div className="relative z-10 font-extrabold text-6xl sm:text-8xl tracking-wider text-transparent bg-clip-text bg-gradient-to-tr from-rose-300 via-pink-200 to-amber-200 drop-shadow-[0_10px_20px_rgba(244,63,94,0.5)] transform animate-in zoom-in-50 duration-300">
            {count}
          </div>
        </div>

        <p className="mt-8 text-rose-200 text-sm sm:text-base font-semibold flex items-center gap-2 bg-rose-950/60 px-5 py-2.5 rounded-full border border-rose-500/30">
          <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
          <span>Senyum ke kamera bersama! Foto akan diambil otomatis...</span>
        </p>
      </div>
    </div>
  );
}
