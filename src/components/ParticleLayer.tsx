/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { Particle } from "../types";

export interface ParticleLayerRef {
  spawnParticles: (x: number, y: number, char: string, colorTheme: "cyan" | "pink" | "red") => void;
}

export const ParticleLayer = forwardRef<ParticleLayerRef, {}>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // Particle update and draw loop
    let animId: number;
    const ctx = canvas.getContext("2d");

    const drawHeart = (c: CanvasRenderingContext2D, x: number, y: number, size: number) => {
      c.beginPath();
      c.moveTo(x, y + size / 4);
      c.bezierCurveTo(x, y - size / 2, x - size, y - size / 2, x - size, y + size / 4);
      c.bezierCurveTo(x - size, y + (size * 3) / 4, x, y + size * 1.1, x, y + size * 1.4);
      c.bezierCurveTo(x, y + size * 1.1, x + size, y + (size * 3) / 4, x + size, y + size / 4);
      c.bezierCurveTo(x + size, y - size / 2, x, y - size / 2, x, y + size / 4);
      c.closePath();
      c.fill();
    };

    const update = () => {
      if (!ctx || !canvas) return;

      // Clears with subtle tail for motion blur trail!
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        
        // Soft gravity or upward lift
        p.vy -= 0.05; // accelerate upward
        p.vx += Math.sin(p.y * 0.05) * 0.1; // realistic floating wiggle
        
        p.alpha -= 0.015; // fade out

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        
        // Set glowing shadow
        ctx.shadowBlur = 10 * p.alpha;
        ctx.shadowColor = p.color;

        // Draw Heart bubble
        ctx.fillStyle = p.color;
        drawHeart(ctx, p.x, p.y, p.scale * 12);

        // Draw Tapped text character in the center
        ctx.shadowBlur = p.alpha * 4;
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${Math.max(10, p.scale * 14)}px "Inter", "Hiragino Kaku Gothic ProN", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.character, p.x, p.y + (p.scale * 4));

        ctx.restore();
      }

      animId = requestAnimationFrame(update);
    };

    animId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  // Expose particle spawn method to parent
  useImperativeHandle(ref, () => ({
    spawnParticles(x: number, y: number, char: string, colorTheme: "cyan" | "pink" | "red") {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const localX = x - rect.left;
      const localY = y - rect.top;

      // Decide particle palette colors matching Hatsune Miku aesthetics
      let colors: string[] = [];
      if (colorTheme === "cyan") {
        colors = ["rgba(57, 197, 187, 0.8)", "rgba(46, 155, 147, 0.8)", "rgba(103, 232, 249, 0.8)"];
      } else if (colorTheme === "pink") {
        colors = ["rgba(236, 72, 153, 0.8)", "rgba(255, 20, 147, 0.8)", "rgba(244, 63, 94, 0.8)"];
      } else {
        colors = ["rgba(230, 57, 70, 0.8)", "rgba(224, 30, 90, 0.8)", "rgba(251, 191, 36, 0.8)"];
      }

      // Spawn multiple micro hearts for each tap
      const count = 5;
      for (let i = 0; i < count; i++) {
        const randColor = colors[Math.floor(Math.random() * colors.length)];
        const scale = 0.6 + Math.random() * 0.7;
        const vx = (Math.random() - 0.5) * 4;
        const vy = -1.5 - Math.random() * 3;

        particlesRef.current.push({
          id: Math.random().toString(),
          x: localX,
          y: localY,
          color: randColor,
          scale,
          vx,
          vy,
          alpha: 1.0,
          character: char,
        });
      }
    }
  }));

  return (
    <canvas
      id="resonance-particles-canvas"
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-30"
    />
  );
});

ParticleLayer.displayName = "ParticleLayer";
