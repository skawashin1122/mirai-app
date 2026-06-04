/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { ResonanceLog, SongMetadata, LyricPhrase } from "../types";
import { Award, Zap, Heart, Flame } from "lucide-react";

interface ResultChartProps {
  song: SongMetadata;
  logs: ResonanceLog[];
}

export const ResultChart: React.FC<ResultChartProps> = ({ song, logs }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(600);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Resize listener for responsive layout
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      setWidth(containerRef.current?.clientWidth || 600);
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const totalDurationMs = song.duration * 1000;
  const numSteps = 40; // Timeline divided into 40 segments
  const stepMs = totalDurationMs / numSteps;

  // Calculate tap count density per step
  let rawDensity = new Array(numSteps).fill(0);
  logs.forEach((log) => {
    const idx = Math.min(numSteps - 1, Math.floor(log.timestamp / stepMs));
    if (idx >= 0) {
      rawDensity[idx] += 1;
    }
  });

  // Generate beautiful ambient background waves so the chart looks rich
  // even if the user didn't tap much, representing atmospheric song energy
  const getAmbientEnergy = (i: number) => {
    // Standard ambient sine waves matching vocaloid music flows
    const angle = (i / numSteps) * Math.PI * 3;
    return Math.sin(angle) * 1.5 + Math.cos(angle * 2) * 0.8 + 2;
  };

  // Merge user taps with the ambient energy curve to calculate final heat curve
  let densityData = rawDensity.map((tapCount, idx) => {
    const ambient = getAmbientEnergy(idx);
    const tapContribution = tapCount * 4.5; // weight user interactions heavily
    return ambient + tapContribution;
  });

  // Apply moving average smoothing (Gaussian-like 3-tap window) for liquid visual flow
  const smoothedData = densityData.map((val, i) => {
    const prev = densityData[i - 1] ?? val;
    const next = densityData[i + 1] ?? val;
    return (prev + val * 2 + next) / 4;
  });

  // Normalized to a height scale of 0 to 100 for SVG drawing
  const maxVal = Math.max(...smoothedData) || 1;
  const chartHeight = 160;
  const paddingBottom = 40;
  const paddingTop = 20;

  const points = smoothedData.map((val, idx) => {
    const x = (idx / (numSteps - 1)) * (width - 24) + 12; // horizontal padding
    const y = chartHeight - (val / maxVal) * (chartHeight - paddingTop - paddingBottom);
    return { x, y, timestamp: idx * stepMs, value: val, tapCount: rawDensity[idx] };
  });

  // Find peak point (highest emotional resonance)
  let peakIdx = 0;
  let peakVal = -1;
  points.forEach((pt, idx) => {
    if (pt.value > peakVal) {
      peakVal = pt.value;
      peakIdx = idx;
    }
  });

  // Helper to map timestamp back to song lyric phrase
  const getLyricAtTime = (ms: number): string => {
    // Find phase covering time, or nearest
    const matched = song.lyrics.find((ph) => ms >= ph.startTime && ms <= ph.endTime);
    if (matched) return matched.text;

    // Find nearest
    let minDiff = Infinity;
    let closestText = "♪（インセルト・間奏）";
    song.lyrics.forEach((ph) => {
      const diffStart = Math.abs(ph.startTime - ms);
      const diffEnd = Math.abs(ph.endTime - ms);
      const diff = Math.min(diffStart, diffEnd);
      if (diff < minDiff) {
        minDiff = diff;
        closestText = ph.text;
      }
    });

    return closestText;
  };

  // Render SVG smooth path (Catmull-Rom or bezier approximations using line connectors with rounded joints)
  const pathD = points.length > 0 
    ? `M ${points[0].x},${points[0].y} ` + points.slice(1).map(p => `L ${p.x},${p.y}`).join(" ")
    : "";

  // SVG Area path for glowing fill under the curve
  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x},${chartHeight} L ${points[0].x},${chartHeight} Z`
    : "";

  const peakPoint = points[peakIdx];
  const peakLyric = getLyricAtTime(peakPoint?.timestamp ?? 0);

  // Handle movement to scan lyrics timeline interactively
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;

    // Find closest index
    let closestIdx = 0;
    let minDistance = Infinity;
    points.forEach((pt, idx) => {
      const dist = Math.abs(pt.x - cursorX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = idx;
      }
    });

    setHoverIndex(closestIdx);
    setHoverPos({ x: points[closestIdx].x, y: points[closestIdx].y });
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setHoverPos(null);
  };

  // Convert milliseconds into readable seconds: m:ss
  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const sec = s % 60;
    return `${Math.floor(s / 60)}:${sec < 10 ? "0" : ""}${sec}`;
  };

  const activeIndex = hoverIndex !== null ? hoverIndex : peakIdx;
  const activePoint = points[activeIndex];
  const activeLyric = getLyricAtTime(activePoint?.timestamp ?? 0);

  return (
    <div id="result-chart-root" ref={containerRef} className="w-full relative flex flex-col space-y-4">
      {/* Top micro badges */}
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400">
          <Zap className="w-4.5 h-4.5 text-yellow-400 animate-pulse" />
          <span>BPM: <span className="text-white font-bold">{song.bpm}</span></span>
          <span className="text-zinc-600">|</span>
          <Award className="w-4.5 h-4.5 text-teal-400" />
          <span>総タップ: <span className="text-white font-bold">{logs.length}回</span></span>
        </div>
        <div id="status-badge" className="text-xs font-mono text-zinc-400 flex items-center space-x-1.5 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
          <span className="w-2 h-2 rounded-full bg-teal-400 inline-block animate-pulse" />
          <span>最高到達点（ピーク）検出中</span>
        </div>
      </div>

      {/* Main interactive SVG box */}
      <div className="relative bg-zinc-950/80 rounded-xl border border-zinc-800 p-2 overflow-visible select-none">
        
        {/* Automatic Peak Bubble PIN / Interactive Bubble POPUP */}
        <div
          id="lyric-dialog-callout"
          className="absolute z-40 bg-zinc-900 border-2 border-teal-400 shadow-xl shadow-teal-500/10 px-4 py-2.5 rounded-xl text-center flex flex-col items-center justify-center transition-all duration-300 pointer-events-none"
          style={{
            left: `${activePoint?.x ?? 0}px`,
            top: `${(activePoint?.y ?? 0) - 75}px`, // float above
            transform: "translateX(-50%)",
            maxWidth: "280px",
            minWidth: "160px"
          }}
        >
          {/* Animated cute icon indicating Peak vs Custom hover */}
          <div className="flex items-center space-x-1 mb-1 text-[10px] uppercase tracking-wider font-mono">
            {activeIndex === peakIdx ? (
              <>
                <Flame className="w-3 h-3 text-pink-500 animate-bounce" />
                <span className="text-pink-400 font-bold">最高共鳴ゾーン {formatTime(activePoint.timestamp)}</span>
              </>
            ) : (
              <>
                <Heart className="w-3 h-3 text-teal-400 fill-teal-400 animate-ping" />
                <span className="text-teal-400">スキャン {formatTime(activePoint.timestamp)}</span>
              </>
            )}
          </div>
          <p id="callout-lyric-text" className="text-white text-xs font-medium tracking-wide break-words line-clamp-2">
            「{activeLyric}」
          </p>

          {/* Dialog tail */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-zinc-900 after:absolute after:top-[-10px] after:left-1/2 after:-translate-x-1/2 after:w-0 after:h-0 after:border-l-7 after:border-l-transparent after:border-r-7 after:border-r-transparent after:border-t-7 after:border-t-teal-400 -z-10" />
        </div>

        {/* SVG Curve drawing */}
        <svg
          id="resonance-curve-svg"
          width="100%"
          height={chartHeight}
          className="overflow-visible cursor-crosshair pb-1"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Soft cyan-magenta gradient under the curve */}
            <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#39C5BB" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#ec4899" stopOpacity="0.10" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>
            
            {/* Premium neon neon curve stroke gradient */}
            <linearGradient id="chart-stroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="40%" stopColor="#39C5BB" />
              <stop offset="70%" stopColor="#db2777" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>

            <filter id="wave-neon">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines */}
          <line x1="12" y1={chartHeight - 40} x2={width - 12} y2={chartHeight - 40} stroke="#27272a" strokeWidth="0.8" strokeDasharray="3 3" />
          <line x1="12" y1={chartHeight - 110} x2={width - 12} y2={chartHeight - 110} stroke="#27272a" strokeWidth="0.8" strokeDasharray="3 3" />

          {/* Filled area */}
          {areaD && (
            <path d={areaD} fill="url(#chart-fill)" className="transition-all duration-300" />
          )}

          {/* Timeline stroke */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="url(#chart-stroke)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#wave-neon)"
              className="transition-all duration-300"
            />
          )}

          {/* Pinned peak point indicator */}
          {peakPoint && (
            <g>
              <circle
                cx={peakPoint.x}
                cy={peakPoint.y}
                r="7"
                fill="#ec4899"
                stroke="#ffffff"
                strokeWidth="2"
                className="animate-ping opacity-75"
              />
              <circle
                cx={peakPoint.x}
                cy={peakPoint.y}
                r="5"
                fill="#ec4899"
                stroke="#ffffff"
                strokeWidth="1.5"
                id="marker-peak"
              />
            </g>
          )}

          {/* Currently scanned point indicator */}
          {hoverPos && (
            <g>
              <line
                x1={hoverPos.x}
                y1={paddingTop / 2}
                x2={hoverPos.x}
                y2={chartHeight}
                stroke="rgba(57, 197, 187, 0.4)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <circle
                cx={hoverPos.x}
                cy={hoverPos.y}
                r="6"
                fill="#39C5BB"
                stroke="#ffffff"
                strokeWidth="1.5"
                id="marker-hover"
              />
            </g>
          )}
        </svg>

        {/* X-Axis labels */}
        <div id="chart-timeline-labels" className="flex justify-between items-center text-[10px] font-mono text-zinc-500 px-3 py-1 bg-zinc-950 rounded-b-lg border-t border-zinc-900">
          <span>0:00</span>
          <span>共鳴タイムライン (秒)</span>
          <span>{formatTime(totalDurationMs)}</span>
        </div>
      </div>
    </div>
  );
};
