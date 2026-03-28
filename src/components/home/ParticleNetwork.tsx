"use client";

import { useEffect, useRef } from "react";

export default function ParticleNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 });
  const animRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const isMobile = window.innerWidth < 768;
    const COUNT = isMobile ? 1200 : 4000;
    const CONNECT = isMobile ? 22 : 26;

    let w = 0, h = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas!.offsetWidth;
      h = canvas!.offsetHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    const px = new Float32Array(COUNT);
    const py = new Float32Array(COUNT);
    const pz = new Float32Array(COUNT);
    const pvx = new Float32Array(COUNT);
    const pvy = new Float32Array(COUNT);
    const ptype = new Uint8Array(COUNT);
    const pphase = new Float32Array(COUNT);
    const psize = new Float32Array(COUNT);

    // Depth: spread evenly but with cubic bias toward foreground
    // So there are particles EVERYWHERE from dust to big bright stars
    for (let i = 0; i < COUNT; i++) {
      // Cubic distribution: more spread, many at all depths
      // but still enough foreground stars
      const r = Math.random();
      pz[i] = r; // linear = even distribution across all depths

      px[i] = Math.random() * 1.6 - 0.3;
      py[i] = Math.random() * 1.6 - 0.3;

      const angle = Math.random() * Math.PI * 2;
      const spd = 0.02 + pz[i] * 0.06;
      pvx[i] = Math.cos(angle) * spd;
      pvy[i] = Math.sin(angle) * spd;

      ptype[i] = Math.random() < 0.42 ? 1 : 0;
      pphase[i] = Math.random() * Math.PI * 2;

      // Size scales dramatically with depth
      // z=0: 0.2px, z=0.5: 1.5px, z=1.0: 5px+
      psize[i] = 0.1 + Math.random() * 0.5;
    }

    function flowX(x: number, y: number, t: number) {
      return Math.sin(y * 1.8 + t) * 0.05
        + Math.cos(x * 1.3 - t * 0.3) * 0.03
        + Math.sin((x + y) * 0.9 + t * 0.5) * 0.02;
    }
    function flowY(x: number, y: number, t: number) {
      return Math.cos(x * 1.5 + t * 0.4) * 0.04
        + Math.sin(y * 1.7 + t * 0.25) * 0.03
        + Math.cos((x - y) * 1.1 - t * 0.4) * 0.02;
    }

    function onMouse(e: MouseEvent) {
      const r = canvas!.getBoundingClientRect();
      mouseRef.current.tx = (e.clientX - r.left) / w;
      mouseRef.current.ty = (e.clientY - r.top) / h;
    }
    function onLeave() { mouseRef.current.tx = 0.5; mouseRef.current.ty = 0.5; }
    function onTouch(e: TouchEvent) {
      const r = canvas!.getBoundingClientRect();
      mouseRef.current.tx = (e.touches[0].clientX - r.left) / w;
      mouseRef.current.ty = (e.touches[0].clientY - r.top) / h;
    }
    canvas.addEventListener("mousemove", onMouse);
    canvas.addEventListener("mouseleave", onLeave);
    canvas.addEventListener("touchmove", onTouch, { passive: true });
    canvas.addEventListener("touchend", onLeave);

    const sxBuf = new Float32Array(COUNT);
    const syBuf = new Float32Array(COUNT);

    const GCELL = 20;
    const gridMap = new Map<number, number[]>();

    let t = 0;

    function animate() {
      t += 0.0015;
      ctx!.clearRect(0, 0, w, h);

      const m = mouseRef.current;
      m.x += (m.tx - m.x) * 0.02;
      m.y += (m.ty - m.y) * 0.02;

      // Update
      for (let i = 0; i < COUNT; i++) {
        const z = pz[i];

        const flowScale = 0.001 + z * 0.003;
        pvx[i] += flowX(px[i] * 2, py[i] * 2, t) * flowScale;
        pvy[i] += flowY(px[i] * 2, py[i] * 2, t) * flowScale;

        pvx[i] += (Math.random() - 0.5) * 0.002;
        pvy[i] += (Math.random() - 0.5) * 0.002;

        // Mouse — only affects particles very close to cursor
        // Gentle push away, not attraction. Creates a ripple, not a magnet.
        const mdx = m.x - px[i], mdy = m.y - py[i];
        const md = Math.sqrt(mdx * mdx + mdy * mdy);
        if (md < 0.08 && md > 0.001 && z > 0.25) {
          const norm = (1 - md / 0.08) * z * 0.3;
          // Push away gently
          pvx[i] -= mdx / md * 0.004 * norm;
          pvy[i] -= mdy / md * 0.004 * norm;
        }

        pvx[i] *= 0.996;
        pvy[i] *= 0.996;

        const spd = Math.sqrt(pvx[i] * pvx[i] + pvy[i] * pvy[i]);
        const maxSpd = 0.08 + z * 0.12;
        if (spd > maxSpd) {
          pvx[i] = (pvx[i] / spd) * maxSpd;
          pvy[i] = (pvy[i] / spd) * maxSpd;
        }

        px[i] += pvx[i] / w;
        py[i] += pvy[i] / h;

        if (px[i] < -0.2) px[i] += 1.4;
        if (px[i] > 1.2) px[i] -= 1.4;
        if (py[i] < -0.2) py[i] += 1.4;
        if (py[i] > 1.2) py[i] -= 1.4;

        // No parallax — particles live in their own world
        sxBuf[i] = px[i] * w;
        syBuf[i] = py[i] * h;
      }

      // Grid
      gridMap.clear();
      for (let i = 0; i < COUNT; i++) {
        const gx = Math.floor(sxBuf[i] / GCELL);
        const gy = Math.floor(syBuf[i] / GCELL);
        const key = gx * 10000 + gy;
        let arr = gridMap.get(key);
        if (!arr) { arr = []; gridMap.set(key, arr); }
        arr.push(i);
      }

      const msx = m.x * w, msy = m.y * h;

      // --- DRAW CONNECTIONS ---
      // Only for z > 0.15 (skip dust)
      ctx!.lineCap = "round";

      for (let i = 0; i < COUNT; i++) {
        if (pz[i] < 0.15) continue;

        const gx = Math.floor(sxBuf[i] / GCELL);
        const gy = Math.floor(syBuf[i] / GCELL);

        for (let ox = -1; ox <= 1; ox++) {
          for (let oy = -1; oy <= 1; oy++) {
            const cell = gridMap.get((gx + ox) * 10000 + (gy + oy));
            if (!cell) continue;
            for (const j of cell) {
              if (j <= i || pz[j] < 0.15) continue;
              if (Math.abs(pz[i] - pz[j]) > 0.12) continue;

              const dx = sxBuf[i] - sxBuf[j], dy = syBuf[i] - syBuf[j];
              const dist = Math.sqrt(dx * dx + dy * dy);
              const avgZ = (pz[i] + pz[j]) / 2;
              const eDist = CONNECT * (0.25 + avgZ);

              if (dist > eDist) continue;

              const strength = 1 - dist / eDist;
              let alpha = strength * strength * (avgZ * avgZ * 0.6);

              const midX = (sxBuf[i] + sxBuf[j]) / 2;
              const midY = (syBuf[i] + syBuf[j]) / 2;
              const mDist = Math.hypot(msx - midX, msy - midY);
              if (mDist < 100) alpha += (1 - mDist / 100) * 0.2;

              alpha = Math.min(alpha, 0.45);
              if (alpha < 0.005) continue;

              const lw = 0.08 + avgZ * 1.8 + strength * 0.6;

              const mixed = ptype[i] !== ptype[j];
              let c: string;
              if (mixed) c = `rgba(255,190,150,${alpha})`;
              else if (ptype[i] === 0) c = `rgba(46,213,115,${alpha})`;
              else c = `rgba(230,115,79,${alpha})`;

              ctx!.beginPath();
              ctx!.moveTo(sxBuf[i], syBuf[i]);
              ctx!.lineTo(sxBuf[j], syBuf[j]);
              ctx!.strokeStyle = c;
              ctx!.lineWidth = lw;
              ctx!.stroke();
            }
          }
        }
      }

      // --- DRAW PARTICLES ---
      // Batch by depth layer for performance (avoid per-particle radialGradient where possible)

      for (let i = 0; i < COUNT; i++) {
        const z = pz[i];
        const pulse = Math.sin(pphase[i] + t * 25) * 0.5 + 0.5;

        let mp = 0;
        const mDist = Math.hypot(msx - sxBuf[i], msy - syBuf[i]);
        if (mDist < 90 + z * 40) mp = 1 - mDist / (90 + z * 40);

        // SIZE: extreme range
        // z=0: ~0.3px (dust), z=0.3: ~1px, z=0.6: ~3px, z=1: ~6px
        const s = psize[i] * (0.3 + z * z * z * 8) * (0.95 + pulse * 0.05 + mp * 0.5);

        // ALPHA: dramatic range
        // z=0: 0.03 (barely visible dust), z=0.5: 0.25, z=1: 0.85
        const a = (0.025 + z * z * 0.85) * (0.9 + pulse * 0.1 + mp * 1.5);

        const isAI = ptype[i] === 0;
        const cr = isAI ? "46,213,115" : "230,115,79";

        // LAYER 1: Dust (z < 0.15) — tiny dots only
        if (z < 0.15) {
          ctx!.beginPath();
          ctx!.arc(sxBuf[i], syBuf[i], Math.max(s, 0.3), 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(${cr},${Math.min(a + mp * 0.2, 0.2)})`;
          ctx!.fill();
          continue;
        }

        // LAYER 2: Background (z 0.15-0.35) — small dots, faint
        if (z < 0.35) {
          ctx!.beginPath();
          ctx!.arc(sxBuf[i], syBuf[i], s, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(${cr},${Math.min(a, 0.4)})`;
          ctx!.fill();
          // Tiny glow only near mouse
          if (mp > 0.1) {
            const gr = s * 3;
            const g = ctx!.createRadialGradient(sxBuf[i], syBuf[i], 0, sxBuf[i], syBuf[i], gr);
            g.addColorStop(0, `rgba(${cr},${mp * 0.12})`);
            g.addColorStop(1, `rgba(${cr},0)`);
            ctx!.fillStyle = g;
            ctx!.beginPath();
            ctx!.arc(sxBuf[i], syBuf[i], gr, 0, Math.PI * 2);
            ctx!.fill();
          }
          continue;
        }

        // LAYER 3: Mid (z 0.35-0.65) — visible nodes with glow
        if (z < 0.65) {
          const gr = s * (2.5 + mp * 3);
          const g = ctx!.createRadialGradient(sxBuf[i], syBuf[i], 0, sxBuf[i], syBuf[i], gr);
          const ga = Math.min(a * 0.2 + mp * 0.08, 0.2);
          g.addColorStop(0, `rgba(${cr},${ga})`);
          g.addColorStop(0.4, `rgba(${cr},${ga * 0.2})`);
          g.addColorStop(1, `rgba(${cr},0)`);
          ctx!.fillStyle = g;
          ctx!.beginPath();
          ctx!.arc(sxBuf[i], syBuf[i], gr, 0, Math.PI * 2);
          ctx!.fill();

          ctx!.beginPath();
          ctx!.arc(sxBuf[i], syBuf[i], s, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(${cr},${Math.min(a, 0.7)})`;
          ctx!.fill();

          if (mp > 0.2) {
            ctx!.beginPath();
            ctx!.arc(sxBuf[i], syBuf[i], s * 0.3, 0, Math.PI * 2);
            ctx!.fillStyle = `rgba(255,255,255,${mp * 0.4})`;
            ctx!.fill();
          }
          continue;
        }

        // LAYER 4: Foreground (z 0.65-0.85) — bright nodes
        if (z < 0.85) {
          const gr = s * (3.5 + mp * 4);
          const g = ctx!.createRadialGradient(sxBuf[i], syBuf[i], 0, sxBuf[i], syBuf[i], gr);
          const ga = Math.min(a * 0.25 + mp * 0.1, 0.3);
          g.addColorStop(0, `rgba(${cr},${ga})`);
          g.addColorStop(0.25, `rgba(${cr},${ga * 0.3})`);
          g.addColorStop(1, `rgba(${cr},0)`);
          ctx!.fillStyle = g;
          ctx!.beginPath();
          ctx!.arc(sxBuf[i], syBuf[i], gr, 0, Math.PI * 2);
          ctx!.fill();

          ctx!.beginPath();
          ctx!.arc(sxBuf[i], syBuf[i], s, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(${cr},${Math.min(a, 0.85)})`;
          ctx!.fill();

          const bright = 0.15 + mp * 0.4;
          ctx!.beginPath();
          ctx!.arc(sxBuf[i], syBuf[i], s * 0.3, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(255,255,255,${bright})`;
          ctx!.fill();
          continue;
        }

        // LAYER 5: Stars (z > 0.85) — big, bright, dramatic glow
        const gr = s * (5 + mp * 6);
        const g = ctx!.createRadialGradient(sxBuf[i], syBuf[i], 0, sxBuf[i], syBuf[i], gr);
        const ga = Math.min(a * 0.3 + mp * 0.15, 0.35);
        g.addColorStop(0, `rgba(${cr},${ga})`);
        g.addColorStop(0.15, `rgba(${cr},${ga * 0.5})`);
        g.addColorStop(0.4, `rgba(${cr},${ga * 0.1})`);
        g.addColorStop(1, `rgba(${cr},0)`);
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.arc(sxBuf[i], syBuf[i], gr, 0, Math.PI * 2);
        ctx!.fill();

        ctx!.beginPath();
        ctx!.arc(sxBuf[i], syBuf[i], s, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${cr},${Math.min(a, 0.95)})`;
        ctx!.fill();

        const bright = Math.min(0.3 + mp * 0.5, 0.9);
        ctx!.beginPath();
        ctx!.arc(sxBuf[i], syBuf[i], s * 0.35, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255,255,255,${bright})`;
        ctx!.fill();
      }

      animRef.current = requestAnimationFrame(animate);
    }

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMouse);
      canvas.removeEventListener("mouseleave", onLeave);
      canvas.removeEventListener("touchmove", onTouch);
      canvas.removeEventListener("touchend", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-auto absolute inset-0 h-full w-full"
      style={{ zIndex: 0 }}
    />
  );
}
