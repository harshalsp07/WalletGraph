"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { animate, utils, stagger } from "animejs";
import DockHeader from "@/components/DockHeader";
import FloatingHeader from "@/components/FloatingHeader";
import {
  getWalletAddress,
  getActiveWalletProvider,
  checkConnection,
  viewGlobalStats,
  type WalletProvider,
} from "@/hooks/contract";

/* ──────────────────────────────────────────
   useScrollProgress — normalised 0‒1 value
   ────────────────────────────────────────── */
function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  const target = useRef(0);
  const current = useRef(0);
  const rafId = useRef<number>(0);

  useEffect(() => {
    const el = document.documentElement;
    const calculateMax = () => el.scrollHeight - el.clientHeight;

    const onScroll = () => {
      const max = calculateMax();
      target.current = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
    };

    const tick = () => {
      const diff = target.current - current.current;
      if (Math.abs(diff) > 0.0005) {
        current.current += diff * 0.08;
        setProgress(current.current);
      } else if (current.current !== target.current) {
        current.current = target.current;
        setProgress(current.current);
      }
      rafId.current = requestAnimationFrame(tick);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
    rafId.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  return progress;
}

/* ──────────────────────────────────────────
   TreeSVG — dramatic organic tree
   ────────────────────────────────────────── */
function TreeSVG({ progress }: { progress: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRefs = useRef<Map<string, SVGPathElement>>(new Map());
  const lengths = useRef<Map<string, number>>(new Map());

  const setRef = useCallback((key: string) => (el: SVGPathElement | null) => {
    if (el) pathRefs.current.set(key, el);
  }, []);

  useEffect(() => {
    pathRefs.current.forEach((el, key) => {
      const len = el.getTotalLength();
      lengths.current.set(key, len);
      el.style.strokeDasharray = String(len);
      el.style.strokeDashoffset = String(len);
    });
  }, []);

  useEffect(() => {
    const reveal = (key: string, start: number, end: number) => {
      const el = pathRefs.current.get(key);
      if (!el) return;
      const len = lengths.current.get(key) ?? el.getTotalLength();
      const t = Math.max(0, Math.min(1, (progress - start) / (end - start)));
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      el.style.strokeDashoffset = String(len * (1 - eased));
    };

    // Crown starts at top of page (progress 0)
    reveal("crownL", 0.00, 0.15);
    reveal("crownR", 0.02, 0.16);
    reveal("crownC", 0.04, 0.20);
    // Canopy branches
    reveal("canL", 0.10, 0.25);
    reveal("canR", 0.14, 0.28);
    reveal("canL2", 0.16, 0.30);
    reveal("canR2", 0.18, 0.32);
    // Upper branches
    reveal("brL2", 0.25, 0.45);
    reveal("brR2", 0.30, 0.50);
    reveal("brL2s", 0.35, 0.52);
    reveal("brR2s", 0.40, 0.54);
    // Lower branches
    reveal("brL1", 0.45, 0.65);
    reveal("brR1", 0.50, 0.70);
    reveal("brL1s", 0.55, 0.72);
    reveal("brR1s", 0.60, 0.75);
    // Trunk
    reveal("trunk", 0.10, 0.85); 
    reveal("trunkR", 0.12, 0.86);
    // Roots
    reveal("roots1", 0.80, 0.95);
    reveal("roots2", 0.82, 0.96);
    reveal("roots3", 0.85, 1.00);
  }, [progress]);

  const op = (start: number, speed = 8) =>
    Math.min(1, Math.max(0, (progress - start) * speed));

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 800 3400"
      className="tree-svg animate-gentle-sway"
      style={{ transformOrigin: '400px 3000px', animationDuration: '18s' }}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        <filter id="treeShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#2a4428" floodOpacity="0.25" />
        </filter>
        <linearGradient id="trunkG" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#5a7a45" stopOpacity="0.6" />
          <stop offset="35%" stopColor="#3d5c3b" stopOpacity="1" />
          <stop offset="65%" stopColor="#4B6E48" stopOpacity="1" />
          <stop offset="100%" stopColor="#5a7a45" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="brG" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#3d5c3b" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#6B8F4E" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id="rootG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4B6E48" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#B2AC88" stopOpacity="0.3" />
        </linearGradient>
        <radialGradient id="leafGlowR" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6B8F4E" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#4B6E48" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="crownGlow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.12" />
          <stop offset="50%" stopColor="#6B8F4E" stopOpacity="0.06" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <filter id="softG" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="1.5" result="b" />
          <feComposite in="SourceGraphic" in2="b" operator="over" />
        </filter>
        <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="g" />
          <feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <g filter="url(#treeShadow)">
        {/* ═══ ROOTS ═══ */}
        <g opacity="0.85">
        <path ref={setRef("roots1")} d="M 400 3000 C 380 3030 340 3060 290 3080 C 240 3100 190 3110 150 3120 M 400 3000 C 420 3040 460 3070 510 3090 C 560 3110 610 3115 650 3120 M 400 3000 C 395 3050 375 3080 345 3110 C 315 3140 280 3155 245 3160" stroke="url(#rootG)" strokeWidth="7" strokeLinecap="round" fill="none" filter="url(#softG)" />
        <path ref={setRef("roots2")} d="M 400 3000 C 405 3045 430 3075 455 3105 C 480 3135 510 3150 545 3155 M 400 3000 C 398 3060 385 3100 365 3130 C 340 3165 305 3180 270 3190" stroke="url(#rootG)" strokeWidth="5" strokeLinecap="round" fill="none" filter="url(#softG)" />
        <path ref={setRef("roots3")} d="M 400 3000 C 402 3055 425 3095 445 3125 C 468 3158 500 3175 530 3185 M 400 3000 C 400 3070 390 3110 372 3150 C 350 3190 320 3210 285 3220" stroke="url(#rootG)" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.6" />
        {/* ground line */}
        <line x1="120" y1="3005" x2="680" y2="3005" stroke="#B2AC88" strokeWidth="2.5" strokeOpacity="0.5" strokeDasharray="8 4" />
        {/* root glow */}
        <ellipse cx="400" cy="3050" rx="200" ry="60" fill="url(#rootG)" opacity={op(0.02, 6) * 0.15} />
      </g>

      {/* ═══ TRUNK — organic with bark texture ═══ */}
      <path ref={setRef("trunk")} d="M 400 3000 C 397 2880 392 2760 395 2640 C 398 2520 404 2400 400 2280 C 396 2160 388 2040 392 1920 C 396 1800 406 1680 402 1560 C 398 1440 386 1320 390 1200 C 394 1080 406 960 400 850" stroke="url(#trunkG)" strokeWidth="32" strokeLinecap="round" fill="none" filter="url(#softG)" />
      {/* trunk right edge highlight */}
      <path ref={setRef("trunkR")} d="M 414 2950 C 412 2830 408 2710 410 2590 C 412 2470 418 2350 414 2230 C 410 2110 404 1990 407 1870 C 410 1750 418 1630 414 1510 C 410 1390 402 1270 405 1150 C 408 1030 416 920 412 860" stroke="#3a5738" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.25" />
      {/* bark lines */}
      <g opacity={op(0.10, 5) * 0.2}>
        <path d="M 392 2700 Q 388 2600 394 2500 Q 400 2400 394 2300" stroke="#2a4428" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 406 2200 Q 402 2100 408 2000 Q 414 1900 406 1800" stroke="#2a4428" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 396 1600 Q 392 1500 398 1400 Q 404 1300 396 1200" stroke="#2a4428" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M 404 1100 Q 400 1000 406 920" stroke="#2a4428" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </g>

      {/* ═══ LOWER BRANCHES ═══ */}
      <path ref={setRef("brL1")} d="M 393 1800 C 340 1740 265 1690 190 1670 C 115 1650 60 1655 20 1640" stroke="url(#brG)" strokeWidth="16" strokeLinecap="round" fill="none" filter="url(#softG)" />
      <path ref={setRef("brR1")} d="M 407 1650 C 460 1590 540 1550 615 1535 C 690 1520 745 1530 790 1520" stroke="url(#brG)" strokeWidth="16" strokeLinecap="round" fill="none" filter="url(#softG)" />
      {/* sub-branches */}
      <path ref={setRef("brL1s")} d="M 260 1690 C 235 1660 200 1640 170 1620 C 140 1600 115 1590 90 1575" stroke="url(#brG)" strokeWidth="7" strokeLinecap="round" fill="none" />
      <path ref={setRef("brR1s")} d="M 560 1545 C 580 1510 610 1485 640 1470 C 670 1455 700 1450 730 1440" stroke="url(#brG)" strokeWidth="7" strokeLinecap="round" fill="none" />

      {/* ═══ UPPER BRANCHES ═══ */}
      <path ref={setRef("brL2")} d="M 392 1350 C 335 1300 260 1260 185 1245 C 110 1230 55 1240 15 1230" stroke="url(#brG)" strokeWidth="14" strokeLinecap="round" fill="none" filter="url(#softG)" />
      <path ref={setRef("brR2")} d="M 408 1200 C 465 1145 545 1110 620 1100 C 695 1090 750 1100 795 1090" stroke="url(#brG)" strokeWidth="14" strokeLinecap="round" fill="none" filter="url(#softG)" />
      {/* sub-branches */}
      <path ref={setRef("brL2s")} d="M 230 1255 C 210 1225 180 1200 150 1185 C 120 1170 90 1165 60 1155" stroke="url(#brG)" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path ref={setRef("brR2s")} d="M 575 1105 C 595 1075 625 1050 660 1040 C 695 1030 725 1035 755 1025" stroke="url(#brG)" strokeWidth="6" strokeLinecap="round" fill="none" />

      {/* ═══ CANOPY BRANCHES ═══ */}
      <path ref={setRef("canL")} d="M 390 1000 C 340 960 265 930 195 918 C 125 906 70 914 35 904" stroke="url(#brG)" strokeWidth="10" strokeLinecap="round" fill="none" />
      <path ref={setRef("canR")} d="M 410 900 C 460 860 535 830 608 820 C 680 810 735 818 772 808" stroke="url(#brG)" strokeWidth="10" strokeLinecap="round" fill="none" />
      <path ref={setRef("canL2")} d="M 388 780 C 340 740 270 710 200 700 C 140 690 85 698 50 688 M 370 760 C 335 730 290 712 250 705" stroke="url(#brG)" strokeWidth="8" strokeLinecap="round" fill="none" />
      <path ref={setRef("canR2")} d="M 412 700 C 460 660 530 632 600 622 C 660 614 710 620 748 610 M 430 680 C 465 650 510 635 550 628" stroke="url(#brG)" strokeWidth="8" strokeLinecap="round" fill="none" />

      {/* ═══ CROWN ═══ */}
      <path ref={setRef("crownL")} d="M 392 600 C 355 550 300 510 255 490 C 220 475 195 465 175 445 C 160 430 155 410 155 390" stroke="#5a7a45" strokeWidth="8" strokeLinecap="round" fill="none" strokeOpacity="0.8" />
      <path ref={setRef("crownR")} d="M 408 580 C 445 530 500 490 545 470 C 580 455 605 445 625 425 C 640 410 645 390 643 370" stroke="#5a7a45" strokeWidth="8" strokeLinecap="round" fill="none" strokeOpacity="0.8" />
      <path ref={setRef("crownC")} d="M 400 560 C 400 500 400 440 400 390 C 400 350 400 310 400 280" stroke="#6B8F4E" strokeWidth="7" strokeLinecap="round" fill="none" strokeOpacity="0.7" />
      </g>

      {/* ═══ FOLIAGE CLUSTERS ═══ */}
      {/* Lower branch foliage */}
      <g opacity={op(0.45)} style={{ transition: "opacity 0.5s" }}>
        {[[20, 1638], [70, 1650], [90, 1572], [130, 1615]].map(([cx, cy], i) => (
          <ellipse key={`fL1-${i}`} cx={cx} cy={cy} rx={30 + i * 5} ry={18 + i * 3} fill="#6B8F4E" fillOpacity={0.16 + i * 0.02} transform={`rotate(${-15 + i * 8},${cx},${cy})`} />
        ))}
        {[[790, 1518], [740, 1530], [730, 1438], [690, 1465]].map(([cx, cy], i) => (
          <ellipse key={`fR1-${i}`} cx={cx} cy={cy} rx={28 + i * 4} ry={16 + i * 3} fill="#4B6E48" fillOpacity={0.16 + i * 0.02} transform={`rotate(${12 - i * 6},${cx},${cy})`} />
        ))}
      </g>

      {/* Upper branch foliage */}
      <g opacity={op(0.25)} style={{ transition: "opacity 0.5s" }}>
        {[[15, 1228], [60, 1240], [60, 1152], [120, 1180]].map(([cx, cy], i) => (
          <ellipse key={`fL2-${i}`} cx={cx} cy={cy} rx={32 + i * 4} ry={18 + i * 2} fill="#6B8F4E" fillOpacity={0.15 + i * 0.02} transform={`rotate(${-12 + i * 7},${cx},${cy})`} />
        ))}
        {[[795, 1088], [750, 1095], [755, 1022], [715, 1033]].map(([cx, cy], i) => (
          <ellipse key={`fR2-${i}`} cx={cx} cy={cy} rx={30 + i * 3} ry={17 + i * 2} fill="#4B6E48" fillOpacity={0.15 + i * 0.02} transform={`rotate(${10 - i * 5},${cx},${cy})`} />
        ))}
      </g>

      {/* Canopy foliage — lush */}
      <g opacity={op(0.10)} style={{ transition: "opacity 0.6s" }}>
        {[
          [35, 902, 40, 24], [100, 912, 36, 20], [50, 686, 38, 22], [200, 698, 34, 18],
          [772, 806, 38, 22], [700, 816, 32, 18], [748, 608, 36, 20], [650, 618, 30, 16],
          [250, 703, 28, 16], [550, 626, 26, 14],
        ].map(([cx, cy, rx, ry], i) => (
          <ellipse key={`can-${i}`} cx={cx} cy={cy} rx={rx} ry={ry} fill={i % 2 === 0 ? "#6B8F4E" : "#4B6E48"} fillOpacity={0.18} transform={`rotate(${(i % 3 - 1) * 12},${cx},${cy})`} />
        ))}
      </g>

      {/* Crown foliage — dense canopy top */}
      <g opacity={op(0.00)} style={{ transition: "opacity 0.6s" }}>
        {[
          [250, 430, 55, 32], [400, 340, 60, 35], [550, 410, 52, 30],
          [320, 370, 45, 26], [480, 360, 48, 28], [400, 290, 42, 24],
          [180, 400, 40, 22], [620, 380, 42, 24], [350, 310, 36, 20],
          [450, 305, 38, 22], [400, 265, 50, 30], [300, 350, 30, 18],
          [500, 340, 32, 18], [155, 388, 30, 18], [643, 368, 28, 16],
        ].map(([cx, cy, rx, ry], i) => (
          <ellipse key={`cr-${i}`} cx={cx} cy={cy} rx={rx} ry={ry} fill={["#4B6E48", "#6B8F4E", "#5a7a45", "#B2AC88"][i % 4]} fillOpacity={0.12 + (i < 6 ? 0.08 : 0)} transform={`rotate(${(i * 17) % 30 - 15},${cx},${cy})`} />
        ))}
        {/* Golden crown glow */}
        <circle cx="400" cy="350" r="180" fill="url(#crownGlow)" />
        <circle cx="400" cy="300" r="100" fill="url(#leafGlowR)" />
      </g>

      {/* ═══ INDIVIDUAL LEAF SHAPES ═══ */}
      {[
        { cx: 90, cy: 1640, r: -30, p: 0.48 }, { cx: 740, cy: 1520, r: 20, p: 0.46 },
        { cx: 55, cy: 1235, r: -18, p: 0.35 }, { cx: 760, cy: 1090, r: 14, p: 0.30 },
        { cx: 170, cy: 910, r: -22, p: 0.20 }, { cx: 640, cy: 810, r: 16, p: 0.16 },
        { cx: 130, cy: 695, r: -14, p: 0.12 }, { cx: 680, cy: 615, r: 10, p: 0.10 },
        { cx: 240, cy: 440, r: -8, p: 0.05 }, { cx: 560, cy: 420, r: 12, p: 0.04 },
        { cx: 350, cy: 330, r: -6, p: 0.02 }, { cx: 450, cy: 320, r: 8, p: 0.02 },
        { cx: 400, cy: 275, r: 0, p: 0.00 }, { cx: 310, cy: 380, r: -15, p: 0.03 },
        { cx: 490, cy: 370, r: 18, p: 0.03 },
      ].map(({ cx, cy, r, p }, i) => (
        <g key={`lf-${i}`} opacity={op(p, 12)} style={{ transition: "opacity 0.3s" }}>
          <path d={`M ${cx} ${cy} Q ${cx + 10} ${cy - 16} ${cx + 20} ${cy} Q ${cx + 10} ${cy + 7} ${cx} ${cy}`}
            fill={i % 3 === 0 ? "#6B8F4E" : i % 3 === 1 ? "#4B6E48" : "#B2AC88"}
            fillOpacity="0.4" transform={`rotate(${r},${cx},${cy})`} />
          <line x1={cx} y1={cy} x2={cx + 16} y2={cy - 3} stroke="#3d5c3b" strokeWidth="0.6" strokeOpacity="0.3" transform={`rotate(${r},${cx},${cy})`} />
        </g>
      ))}
    </svg>
  );
}

/* ──────────────────────────────────────────
   ParticleField — multi-layer parallax leaves + fireflies
   ────────────────────────────────────────── */
function ParticleField() {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!containerRef.current) return;
    const c = containerRef.current;
    const els: HTMLElement[] = [];
    const leafColors = ["#4B6E48", "#6B8F4E", "#B2AC88", "#D4D0BC", "#5a7a45"];

    // Layer 1: Slow deep leaves
    for (let i = 0; i < 35; i++) {
      const el = document.createElement("div");
      el.className = "tree-leaf";
      el.style.background = leafColors[i % leafColors.length];
      el.style.left = `${Math.random() * 100}%`;
      el.style.top = `${Math.random() * 100}%`;
      const s = 6 + Math.random() * 8;
      el.style.width = `${s}px`; el.style.height = `${s}px`;
      el.style.opacity = "0.06";
      c.appendChild(el); els.push(el);
      animate(el, {
        translateX: () => utils.random(-50, 50),
        translateY: () => utils.random(-70, 30),
        rotate: () => utils.random(-180, 180),
        opacity: [{ to: 0.04 }, { to: 0.14 }, { to: 0.04 }],
        scale: [{ to: 0.7 }, { to: 1.3 }, { to: 0.7 }],
        duration: 8000 + Math.random() * 4000,
        delay: i * 250,
        loop: true, easing: "easeInOutSine", alternate: true,
      });
    }

    // Layer 2: Mid speed leaves
    for (let i = 0; i < 28; i++) {
      const el = document.createElement("div");
      el.className = "tree-leaf";
      el.style.background = leafColors[(i + 2) % leafColors.length];
      el.style.left = `${10 + Math.random() * 80}%`;
      el.style.top = `${Math.random() * 100}%`;
      const s = 4 + Math.random() * 6;
      el.style.width = `${s}px`; el.style.height = `${s}px`;
      el.style.opacity = "0.08";
      c.appendChild(el); els.push(el);
      animate(el, {
        translateX: () => utils.random(-90, 90),
        translateY: () => utils.random(-110, 50),
        rotate: () => utils.random(-240, 240),
        opacity: [{ to: 0.06 }, { to: 0.22 }, { to: 0.06 }],
        scale: [{ to: 0.8 }, { to: 1.15 }, { to: 0.85 }],
        duration: 5500 + Math.random() * 3500,
        delay: i * 180,
        loop: true, easing: "easeInOutSine", alternate: true,
      });
    }

    // Fireflies
    for (let i = 0; i < 30; i++) {
      const el = document.createElement("div");
      el.style.cssText = `position:absolute;width:3px;height:3px;border-radius:50%;background:#C9A84C;box-shadow:0 0 8px 3px rgba(201,168,76,0.35);pointer-events:none;opacity:0;left:${Math.random()*100}%;top:${Math.random()*85}%`;
      c.appendChild(el); els.push(el);
      animate(el, {
        translateX: () => utils.random(-140, 140),
        translateY: () => utils.random(-120, 80),
        opacity: [{ to: 0 }, { to: 0.65 }, { to: 0.85 }, { to: 0 }],
        scale: [{ to: 0.4 }, { to: 1.6 }, { to: 0.4 }],
        duration: 3500 + Math.random() * 3500,
        delay: i * 400 + 800,
        loop: true, easing: "easeInOutQuad", alternate: true,
      });
    }

    return () => els.forEach(e => e.remove());
  }, []);

  return <div ref={containerRef} className="pointer-events-none absolute inset-0 overflow-hidden" />;
}

/* ──────────────────────────────────────────
   FallingLeaves — cascade on scroll
   ────────────────────────────────────────── */
function FallingLeaves({ progress }: { progress: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(false);
  useEffect(() => {
    if (progress < 0.50 || done.current || !ref.current) return;
    done.current = true;
    const c = ref.current;
    const cols = ["#4B6E48", "#6B8F4E", "#B2AC88", "#C9A84C", "#5a7a45"];
    for (let i = 0; i < 48; i++) {
      const l = document.createElement("div");
      l.className = "falling-leaf";
      l.style.background = cols[i % cols.length];
      l.style.left = `${15 + Math.random() * 70}%`;
      l.style.top = `${2 + Math.random() * 12}%`;
      const s = 5 + Math.random() * 9;
      l.style.width = `${s}px`; l.style.height = `${s}px`;
      l.style.animationDuration = `${5 + Math.random() * 10}s`;
      l.style.animationDelay = `${i * 0.35}s`;
      c.appendChild(l);
    }
  }, [progress]);
  return <div ref={ref} className="pointer-events-none absolute inset-0 overflow-hidden z-[2]" />;
}

/* ──────────────────────────────────────────
   ScrollReveal
   ────────────────────────────────────────── */
function ScrollReveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const ran = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !ran.current) {
        ran.current = true;
        animate(el, { opacity: [0, 1], translateY: [35, 0], duration: 750, delay, easing: "easeOutCubic" });
      }
    }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);
  return <div ref={ref} className={`scroll-reveal ${className}`} style={{ opacity: 0 }}>{children}</div>;
}

/* ──────────────────────────────────────────
   BranchCard
   ────────────────────────────────────────── */
function BranchCard({ icon, title, description, side = "left", delay = 0 }: { icon: React.ReactNode; title: string; description: string; side?: "left" | "right"; delay?: number }) {
  return (
    <ScrollReveal delay={delay}>
      <div className={`tree-branch-card ${side === "right" ? "branch-right" : "branch-left"}`}>
        <div className="branch-card-icon"><div className="text-[var(--forest)]">{icon}</div></div>
        <h3 className="text-lg font-heading font-bold text-[var(--dark-ink)] mb-2">{title}</h3>
        <p className="text-sm text-[var(--stone)] leading-relaxed">{description}</p>
      </div>
    </ScrollReveal>
  );
}

/* ──────────────────────────────────────────
   StatCounter
   ────────────────────────────────────────── */
function StatCounter({ value, label }: { value: number; label: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const triggered = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!wrapRef.current) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !triggered.current && value > 0) {
        triggered.current = true;
        const o = { val: 0 };
        animate(o, { val: value, round: 1, duration: 1800, easing: "easeOutExpo", onUpdate: () => { if (ref.current) ref.current.textContent = String(Math.round(o.val)); } });
      }
    }, { threshold: 0.3 });
    obs.observe(wrapRef.current);
    return () => obs.disconnect();
  }, [value]);
  return (
    <div ref={wrapRef} className="text-center">
      <p className="text-4xl sm:text-5xl font-heading font-bold text-[var(--dark-ink)] embossed"><span ref={ref}>{value}</span></p>
      <p className="text-xs uppercase tracking-wider text-[var(--stone)] font-semibold mt-2">{label}</p>
    </div>
  );
}

/* ──────────────────────────────────────────
   HOME PAGE
   ────────────────────────────────────────── */
export default function Home() {
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletProvider, setWalletProvider] = useState<WalletProvider | null>(null);
  const [globalStats, setGlobalStats] = useState<{ total_wallets: number; total_endorsements: number; total_reports: number } | null>(null);
  const scrollProgress = useScrollProgress();

  useEffect(() => {
    (async () => { try { if (await checkConnection()) { setWalletProvider(getActiveWalletProvider()); const addr = await getWalletAddress(); if (addr) setWalletAddress(addr); } } catch {} })();
  }, []);

  useEffect(() => {
    (async () => { try { const s = await viewGlobalStats(); if (s && typeof s === "object") { setGlobalStats({ total_wallets: Number((s as Record<string, unknown>).total_wallets ?? 0), total_endorsements: Number((s as Record<string, unknown>).total_endorsements ?? 0), total_reports: Number((s as Record<string, unknown>).total_reports ?? 0) }); } } catch {} })();
  }, []);

  const handleConnect = useCallback(async () => {
    router.push("/login");
  }, [router]);

  const handleDisconnect = useCallback(() => setWalletAddress(null), []);

  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--parchment)]">
      <FloatingHeader />
      <DockHeader walletAddress={walletAddress} walletProvider={walletProvider} onConnect={handleConnect} onDisconnect={handleDisconnect} isConnecting={false} />

      {/* ambient blobs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-15%] left-[-8%] h-[500px] w-[500px] rounded-full bg-[var(--sage)]/10 blur-[100px] animate-gentle-sway" />
        <div className="absolute bottom-[-10%] right-[-5%] h-[400px] w-[400px] rounded-full bg-[var(--forest)]/8 blur-[120px] animate-gentle-sway" style={{ animationDelay: "4s" }} />
        <div className="absolute top-[30%] right-[10%] h-[300px] w-[300px] rounded-full bg-[var(--amber-sap)]/5 blur-[100px] animate-gentle-sway" style={{ animationDelay: "2s" }} />
        <div className="absolute top-[60%] left-[5%] h-[350px] w-[350px] rounded-full bg-[var(--forest)]/5 blur-[130px] animate-gentle-sway" style={{ animationDelay: "6s" }} />
      </div>

      <main className="relative z-10 flex flex-1 flex-col items-center">
        <div className="tree-container">

          {/* SVG tree */}
          <div className="tree-svg-wrapper w-full max-w-[400px] sm:max-w-[500px] md:max-w-[600px] lg:max-w-[700px]">
            <TreeSVG progress={scrollProgress} />
          </div>

          {/* Falling leaves triggered by scroll */}
          <FallingLeaves progress={scrollProgress} />

          {/* ── HERO ── */}
          <section className="tree-section hero-section">
            <ParticleField />
            <ScrollReveal className="w-full max-w-2xl mx-auto text-center px-6">
              <div className="mb-6 inline-flex items-center gap-2 rounded-xl border-2 border-[var(--forest)] bg-[var(--warm-cream)] px-5 py-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--forest)] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--forest)]" />
                </span>
                <span className="text-sm font-mono-data font-semibold text-[var(--forest)] uppercase tracking-wider">
                  Powered by Soroban · Stellar
                </span>
              </div>

              <h1 className="mb-6">
                <span className="block text-5xl sm:text-6xl md:text-7xl font-heading font-bold tracking-tight leading-[1.05]">
                  <span className="embossed text-[var(--dark-ink)]">Wallet </span>
                  <span className="animate-gradient-drift bg-clip-text text-transparent embossed" style={{ backgroundImage: "linear-gradient(135deg, var(--forest), var(--sage), var(--moss), var(--forest))", backgroundSize: "300% 300%" }}>
                    Reputation
                  </span>
                </span>
                <span className="block text-5xl sm:text-6xl md:text-7xl font-heading font-bold tracking-tight leading-[1.05] embossed text-[var(--dark-ink)]">
                  Graph
                </span>
              </h1>

              <p className="mx-auto max-w-xl text-lg sm:text-xl leading-relaxed text-[var(--stone)] mb-3">
                A decentralized, on-chain reputation layer for Stellar wallets.
              </p>
              <p className="mx-auto max-w-xl text-base leading-relaxed text-[var(--stone)]/70 handwritten text-xl mb-10">
                Register, endorse, and report — immutably on the blockchain
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/login" className="btn-forest text-base px-8 py-4 cursor-pointer">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                  </svg>
                  Get Started
                </Link>
                <a href="#features" className="btn-outline text-base px-8 py-4 cursor-pointer">
                  Explore Features
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60"><path d="m6 9 6 6 6-6" /></svg>
                </a>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={400} className="w-full flex justify-center mt-12">
              <div className="flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity animate-bounce">
                <span className="text-[10px] font-mono-data text-[var(--forest)] uppercase tracking-widest font-semibold flex items-center gap-2">
                  <span className="h-px w-4 bg-[var(--forest)] opacity-50" />
                  Scroll to grow
                  <span className="h-px w-4 bg-[var(--forest)] opacity-50" />
                </span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--forest)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="7" />
                  <line x1="12" y1="6" x2="12" y2="10" />
                </svg>
                <svg className="mt-[-8px] text-[var(--forest)] opacity-50" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </ScrollReveal>
          </section>

          {/* ── FEATURES ── */}
          <section id="features" className="tree-section features-section">
            <div className="features-grid">
              <ScrollReveal className="col-span-full text-center mb-8" delay={0}>
                <div className="tree-section-label">Main Branches</div>
                <h2 className="text-3xl sm:text-4xl font-heading font-bold text-[var(--dark-ink)] embossed mb-4">Built for Trust</h2>
                <p className="text-base text-[var(--stone)] max-w-lg mx-auto">Everything you need to build and verify reputation on the Stellar network</p>
              </ScrollReveal>

              <div className="branch-cards-left">
                <BranchCard side="left" delay={100} icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>} title="Lookup" description="Search any wallet's reputation by ID or Stellar address. View scores, endorsements, and reports." />
                <BranchCard side="left" delay={200} icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12" /><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" /></svg>} title="Endorse" description="Build trust by endorsing reliable wallets. Each endorsement adds +1 to the reputation score." />
              </div>
              <div className="trunk-spacer" />
              <div className="branch-cards-right">
                <BranchCard side="right" delay={150} icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>} title="Register" description="Create your on-chain identity. Your wallet address maps to a unique ID that others can reference." />
                <BranchCard side="right" delay={250} icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>} title="Report" description="Flag suspicious wallets to protect the community. Each report deducts -3 from the score." />
              </div>
            </div>
          </section>

          {/* ── HOW IT WORKS ── */}
          <section className="tree-section canopy-section">
            <ScrollReveal className="text-center mb-12" delay={0}>
              <div className="tree-section-label">Upper Canopy</div>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-[var(--dark-ink)] embossed mb-4">How It Works</h2>
              <p className="text-base text-[var(--stone)] max-w-lg mx-auto">Get started in three simple steps</p>
            </ScrollReveal>

            <div className="canopy-steps">
              {[
                { num: 1, title: "Choose Wallet", desc: "Pick Freighter, Rabet, xBull, or future supported wallets from the provider login hub" },
                { num: 2, title: "Register", desc: "Create your on-chain identity with a unique wallet ID" },
                { num: 3, title: "Build Reputation", desc: "Get endorsed or report others to establish trust" },
              ].map(({ num, title, desc }, i) => (
                <ScrollReveal key={num} delay={i * 120}>
                  <div className="canopy-step">
                    <div className="canopy-step-number"><span>{num}</span></div>
                    {i < 2 && <div className="canopy-step-connector" />}
                    <h4 className="text-base font-heading font-bold text-[var(--dark-ink)] mt-5 mb-1">{title}</h4>
                    <p className="text-sm text-[var(--stone)] max-w-[200px]">{desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            <ScrollReveal delay={300} className="mt-16">
              <div className="score-card">
                <h3 className="text-base font-heading font-bold text-[var(--dark-ink)] mb-4 text-center">Score Mechanics</h3>
                <div className="flex items-center justify-center gap-8 flex-wrap">
                  <div className="text-center"><p className="text-2xl font-heading font-bold text-[var(--forest)]">+1</p><p className="text-[10px] uppercase tracking-wider text-[var(--stone)] mt-1">Endorsement</p></div>
                  <div className="h-10 w-px bg-[var(--faded-sage)]" />
                  <div className="text-center"><p className="text-2xl font-heading font-bold text-[var(--terra)]">-3</p><p className="text-[10px] uppercase tracking-wider text-[var(--stone)] mt-1">Report</p></div>
                  <div className="h-10 w-px bg-[var(--faded-sage)]" />
                  <div className="text-center"><p className="text-2xl font-heading font-bold text-[var(--amber-sap)]">3:1</p><p className="text-[10px] uppercase tracking-wider text-[var(--stone)] mt-1">Neutralize</p></div>
                </div>
              </div>
            </ScrollReveal>
          </section>

          {/* ── CROWN / STATS ── */}
          <section className="tree-section crown-section">
            <div className="crown-shimmer" />
            <ScrollReveal className="text-center mb-12" delay={0}>
              <div className="tree-section-label crown-label">Crown · Treetop</div>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-[var(--dark-ink)] embossed mb-4">Network at a Glance</h2>
            </ScrollReveal>

            {globalStats && (
              <div className="crown-stats">
                <StatCounter value={globalStats.total_wallets} label="Registered Wallets" />
                <div className="h-16 w-px bg-[var(--faded-sage)] hidden sm:block" />
                <StatCounter value={globalStats.total_endorsements} label="Endorsements" />
                <div className="h-16 w-px bg-[var(--faded-sage)] hidden sm:block" />
                <StatCounter value={globalStats.total_reports} label="Reports" />
              </div>
            )}

            <ScrollReveal delay={200} className="text-center mt-16">
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-[var(--dark-ink)] embossed mb-4">Ready to Get Started?</h2>
              <p className="text-base text-[var(--stone)] max-w-md mx-auto mb-8">Connect your wallet and join the reputation network on Stellar</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/login" className="btn-forest text-base px-8 py-4 cursor-pointer">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg>
                  Connect Your Wallet
                </Link>
                <Link href="/graph" className="btn-outline text-base px-8 py-4 cursor-pointer">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" /></svg>
                  View Graph
                </Link>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={300} className="mt-16">
              <div className="trust-badges">
                {[
                  { label: "Soroban Smart Contracts", icon: "⬡" },
                  { label: "Decentralized", icon: "◎" },
                  { label: "Immutable Records", icon: "⛨" },
                  { label: "Testnet Powered", icon: "◷" },
                ].map(({ label, icon }) => (
                  <div key={label} className="trust-badge">
                    <span className="text-[var(--forest)] text-sm">{icon}</span>
                    <span className="text-xs font-medium text-[var(--stone)]">{label}</span>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </section>

          {/* ── FOOTER ── */}
          <footer className="tree-section footer-section">
            <div className="footer-ground-line" />
            <div className="flex flex-col items-center gap-5">
              <div className="flex items-center gap-5 text-[11px] text-[var(--stone)] font-mono-data flex-wrap justify-center">
                <span>Stellar Network</span><span className="h-4 w-px bg-[var(--faded-sage)]" /><span>Multi-wallet login</span><span className="h-4 w-px bg-[var(--faded-sage)]" /><span>Soroban Smart Contracts</span>
              </div>
              <p className="text-[10px] text-[var(--stone)]/50 handwritten text-base text-center">Built on the Stellar blockchain — empowering trust in decentralised finance</p>
              <p className="text-xs text-[var(--stone)]/80 mt-2 font-mono-data uppercase tracking-widest text-center">
                Developed by <a href="https://harshal.great-site.net/" target="_blank" rel="noopener noreferrer" className="text-[var(--forest)] hover:text-[#3d5c3b] font-bold transition-colors">Harshal</a>
              </p>
              <div className="scroll-progress-bar">
                <div className="scroll-progress-fill" style={{ width: `${scrollProgress * 100}%` }} />
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
