/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

interface WaveformOverlayProps {
  isActivated: boolean;
  onActivated: (clientX: number, clientY: number) => void;
}

interface HeartbeatRipple {
  id: string;
  x: number;
  y: number;
}

export const WaveformOverlay: React.FC<WaveformOverlayProps> = ({
  isActivated,
  onActivated,
}) => {
  const [ripples, setRipples] = useState<HeartbeatRipple[]>([]);
  const [time, setTime] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Animation cycle
  useEffect(() => {
    let animId: number;
    const tick = () => {
      setTime((prev) => prev + 0.05);
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isActivated) return;

    const rect = containerRef.current?.getBoundingClientRect();
    const x = e.clientX - (rect?.left || 0);
    const y = e.clientY - (rect?.top || 0);

    const newRipple: HeartbeatRipple = {
      id: Math.random().toString(),
      x,
      y,
    };

    setRipples((prev) => [...prev, newRipple]);
    onActivated(e.clientX, e.clientY);

    // Clean up ripples after animation duration
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 1500);
  };

  // Generate SVG path for the wave
  const generatePath = () => {
    const width = 1000;
    const height = 200;
    const points = [];
    const amplitude = isActivated ? 35 : 3; // Hyperactive after click, subtle before click
    const frequency = isActivated ? 0.15 : 0.04;

    for (let x = 0; x <= width; x += 10) {
      // Calculate sin wave. Add secondary wave harmonics for premium organic liquidity
      const centerDist = Math.abs(x - width / 2) / (width / 2); // 0 at center, 1 at edges
      const envelope = Math.max(0, 1 - centerDist * 1.5); // taper off at edges

      let y = height / 2;
      if (isActivated) {
        y +=
          Math.sin(x * frequency + time * 3) * amplitude * envelope +
          Math.cos(x * 0.1 - time * 5) * (amplitude * 0.4) * envelope;
      } else {
        y +=
          Math.sin(x * frequency + time * 0.8) * amplitude * envelope +
          Math.sin(x * 0.01 - time * 0.3) * (amplitude * 0.5);
      }
      points.push(`${x},${y}`);
    }

    return `M ${points.join(" L ")}`;
  };

  return (
    <div
      id="waveform-entry-root"
      ref={containerRef}
      className="relative w-full h-48 bg-transparent cursor-pointer flex items-center justify-center select-none overflow-hidden"
      onClick={handleClick}
    >
      {/* Background neon glow */}
      <div className="absolute inset-0 bg-radial from-teal-950/20 via-transparent to-transparent pointer-events-none" />

      {/* SVG Path visualizer */}
      <svg
        id="waveform-svg"
        viewBox="0 0 1000 200"
        preserveAspectRatio="none"
        className="w-full h-full opacity-80"
      >
        <defs>
          <linearGradient id="wave-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.1" />
            <stop offset="30%" stopColor="#14b8a6" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#39C5BB" stopOpacity="1" />
            <stop offset="70%" stopColor="#ec4899" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.1" />
          </linearGradient>
          <filter id="neon-glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d={generatePath()}
          fill="none"
          stroke="url(#wave-grad)"
          strokeWidth={isActivated ? "3.5" : "1.5"}
          strokeLinecap="round"
          filter="url(#neon-glow)"
          className="transition-all duration-300"
        />
      </svg>

      {/* Pulsing overlay ripples */}
      <AnimatePresence>
        {ripples.map((rip) => (
          <motion.div
            key={rip.id}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 6, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{
              position: "absolute",
              left: rip.x - 20,
              top: rip.y - 20,
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "2px solid #39C5BB",
              boxShadow: "0 0 15px #39C5BB, inset 0 0 10px #39C5BB",
              pointerEvents: "none",
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
