"use client";

import { useRef, useCallback, useEffect } from "react";

export default function TreeSVG({ progress }: { progress: number }) {
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

    reveal("crownL", 0.00, 0.15);
    reveal("crownR", 0.02, 0.16);
    reveal("crownC", 0.04, 0.20);
    reveal("canL", 0.10, 0.25);
    reveal("canR", 0.14, 0.28);
    reveal("canL2", 0.16, 0.30);
    reveal("canR2", 0.18, 0.32);
    reveal("brL2", 0.25, 0.45);
    reveal("brR2", 0.30, 0.50);
    reveal("brL2s", 0.35, 0.52);
    reveal("brR2s", 0.40, 0.54);
    reveal("brL1", 0.45, 0.65);
    reveal("brR1", 0.50, 0.70);
    reveal("brL1s", 0.55, 0.72);
    reveal("brR1s", 0.60, 0.75);
    reveal("trunk", 0.10, 0.85);
    reveal("trunkR", 0.12, 0.86);
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
          <feDropShadow dx="3" dy="15" stdDeviation="14" floodColor="#1a2e18" floodOpacity="0.12" />
        </filter>
        <linearGradient id="trunkG" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6a8a55" stopOpacity="0.45" />
          <stop offset="20%" stopColor="#4a6a3d" stopOpacity="0.9" />
          <stop offset="40%" stopColor="#3d5c3b" stopOpacity="1" />
          <stop offset="60%" stopColor="#4B6E48" stopOpacity="1" />
          <stop offset="80%" stopColor="#3a5738" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#6a8a55" stopOpacity="0.45" />
        </linearGradient>
        <linearGradient id="brG" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#2e4a2c" stopOpacity="0.95" />
          <stop offset="40%" stopColor="#3d5c3b" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#7aa05e" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="rootG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4B6E48" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#6a6a4a" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#B2AC88" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="mossG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7aaa5e" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#4B6E48" stopOpacity="0.1" />
        </linearGradient>
        <radialGradient id="leafGlowR" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8aba6e" stopOpacity="0.5" />
          <stop offset="60%" stopColor="#6B8F4E" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#4B6E48" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="crownGlow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#e8d878" stopOpacity="0.14" />
          <stop offset="30%" stopColor="#C9A84C" stopOpacity="0.08" />
          <stop offset="60%" stopColor="#6B8F4E" stopOpacity="0.04" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <linearGradient id="sunRayG" x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#fff8dc" stopOpacity="0.06" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
        <filter id="softG" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="1.5" result="b" />
          <feComposite in="SourceGraphic" in2="b" operator="over" />
        </filter>
        <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="g" />
          <feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="innerDepth" x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="barkNoise" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" />
        </filter>
      </defs>

      <g filter="url(#treeShadow)">
        <g opacity="0.85">
        <path ref={setRef("roots1")} d="M 400 3000 C 380 3030 340 3060 290 3080 C 240 3100 190 3110 150 3120 M 400 3000 C 420 3040 460 3070 510 3090 C 560 3110 610 3115 650 3120 M 400 3000 C 395 3050 375 3080 345 3110 C 315 3140 280 3155 245 3160" stroke="url(#rootG)" strokeWidth="7" strokeLinecap="round" fill="none" filter="url(#softG)" />
        <path ref={setRef("roots2")} d="M 400 3000 C 405 3045 430 3075 455 3105 C 480 3135 510 3150 545 3155 M 400 3000 C 398 3060 385 3100 365 3130 C 340 3165 305 3180 270 3190" stroke="url(#rootG)" strokeWidth="5" strokeLinecap="round" fill="none" filter="url(#softG)" />
        <path ref={setRef("roots3")} d="M 400 3000 C 402 3055 425 3095 445 3125 C 468 3158 500 3175 530 3185 M 400 3000 C 400 3070 390 3110 372 3150 C 350 3190 320 3210 285 3220" stroke="url(#rootG)" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.6" />
        <line x1="120" y1="3005" x2="680" y2="3005" stroke="#B2AC88" strokeWidth="2.5" strokeOpacity="0.5" strokeDasharray="8 4" />
        <ellipse cx="400" cy="3050" rx="200" ry="60" fill="url(#rootG)" opacity={op(0.02, 6) * 0.15} />
      </g>

      <path ref={setRef("trunk")} d="M 400 3000 C 397 2880 392 2760 395 2640 C 398 2520 404 2400 400 2280 C 396 2160 388 2040 392 1920 C 396 1800 406 1680 402 1560 C 398 1440 386 1320 390 1200 C 394 1080 406 960 400 850" stroke="url(#trunkG)" strokeWidth="32" strokeLinecap="round" fill="none" filter="url(#softG)" />
      <path ref={setRef("trunkR")} d="M 414 2950 C 412 2830 408 2710 410 2590 C 412 2470 418 2350 414 2230 C 410 2110 404 1990 407 1870 C 410 1750 418 1630 414 1510 C 410 1390 402 1270 405 1150 C 408 1030 416 920 412 860" stroke="#3a5738" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.25" />
      <g opacity={op(0.10, 5) * 0.25}>
        <path d="M 392 2700 Q 388 2600 394 2500 Q 400 2400 394 2300" stroke="#2a4428" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M 406 2200 Q 402 2100 408 2000 Q 414 1900 406 1800" stroke="#2a4428" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M 396 1600 Q 392 1500 398 1400 Q 404 1300 396 1200" stroke="#2a4428" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M 404 1100 Q 400 1000 406 920" stroke="#2a4428" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M 398 2850 Q 396 2780 400 2720" stroke="#1e3820" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5" />
        <path d="M 402 2050 Q 406 1980 400 1920" stroke="#1e3820" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5" />
        <path d="M 394 1450 Q 398 1380 392 1320" stroke="#1e3820" strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0.4" />
      </g>
      <path d="M 386 2950 C 384 2830 380 2710 382 2590 C 384 2470 390 2350 386 2230 C 382 2110 376 1990 379 1870 C 382 1750 390 1630 386 1510 C 382 1390 374 1270 377 1150 C 380 1030 388 920 384 860" stroke="#2a4428" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.12" />
      <g opacity={op(0.12, 4) * 0.35}>
        <ellipse cx="388" cy="2500" rx="18" ry="8" fill="#6aaa4e" fillOpacity="0.25" transform="rotate(-8,388,2500)" />
        <ellipse cx="412" cy="2000" rx="14" ry="6" fill="#7aaa5e" fillOpacity="0.2" transform="rotate(5,412,2000)" />
        <ellipse cx="394" cy="1500" rx="16" ry="7" fill="#5a9a3e" fillOpacity="0.22" transform="rotate(-12,394,1500)" />
        <ellipse cx="406" cy="1100" rx="12" ry="5" fill="#6aaa4e" fillOpacity="0.18" transform="rotate(8,406,1100)" />
      </g>
      <g opacity={op(0.15, 4) * 0.3}>
        <ellipse cx="402" cy="2400" rx="6" ry="8" fill="#1e3820" fillOpacity="0.4" />
        <ellipse cx="402" cy="2400" rx="4" ry="5" fill="#2a4428" fillOpacity="0.3" />
        <ellipse cx="398" cy="1700" rx="5" ry="7" fill="#1e3820" fillOpacity="0.35" />
        <ellipse cx="398" cy="1700" rx="3" ry="4" fill="#2a4428" fillOpacity="0.25" />
      </g>

      <path ref={setRef("brL1")} d="M 393 1800 C 340 1740 265 1690 190 1670 C 115 1650 60 1655 20 1640" stroke="url(#brG)" strokeWidth="16" strokeLinecap="round" fill="none" filter="url(#softG)" />
      <path ref={setRef("brR1")} d="M 407 1650 C 460 1590 540 1550 615 1535 C 690 1520 745 1530 790 1520" stroke="url(#brG)" strokeWidth="16" strokeLinecap="round" fill="none" filter="url(#softG)" />
      <path ref={setRef("brL1s")} d="M 260 1690 C 235 1660 200 1640 170 1620 C 140 1600 115 1590 90 1575" stroke="url(#brG)" strokeWidth="7" strokeLinecap="round" fill="none" />
      <path ref={setRef("brR1s")} d="M 560 1545 C 580 1510 610 1485 640 1470 C 670 1455 700 1450 730 1440" stroke="url(#brG)" strokeWidth="7" strokeLinecap="round" fill="none" />

      <path ref={setRef("brL2")} d="M 392 1350 C 335 1300 260 1260 185 1245 C 110 1230 55 1240 15 1230" stroke="url(#brG)" strokeWidth="14" strokeLinecap="round" fill="none" filter="url(#softG)" />
      <path ref={setRef("brR2")} d="M 408 1200 C 465 1145 545 1110 620 1100 C 695 1090 750 1100 795 1090" stroke="url(#brG)" strokeWidth="14" strokeLinecap="round" fill="none" filter="url(#softG)" />
      <path ref={setRef("brL2s")} d="M 230 1255 C 210 1225 180 1200 150 1185 C 120 1170 90 1165 60 1155" stroke="url(#brG)" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path ref={setRef("brR2s")} d="M 575 1105 C 595 1075 625 1050 660 1040 C 695 1030 725 1035 755 1025" stroke="url(#brG)" strokeWidth="6" strokeLinecap="round" fill="none" />

      <path ref={setRef("canL")} d="M 390 1000 C 340 960 265 930 195 918 C 125 906 70 914 35 904" stroke="url(#brG)" strokeWidth="10" strokeLinecap="round" fill="none" />
      <path ref={setRef("canR")} d="M 410 900 C 460 860 535 830 608 820 C 680 810 735 818 772 808" stroke="url(#brG)" strokeWidth="10" strokeLinecap="round" fill="none" />
      <path ref={setRef("canL2")} d="M 388 780 C 340 740 270 710 200 700 C 140 690 85 698 50 688 M 370 760 C 335 730 290 712 250 705" stroke="url(#brG)" strokeWidth="8" strokeLinecap="round" fill="none" />
      <path ref={setRef("canR2")} d="M 412 700 C 460 660 530 632 600 622 C 660 614 710 620 748 610 M 430 680 C 465 650 510 635 550 628" stroke="url(#brG)" strokeWidth="8" strokeLinecap="round" fill="none" />

      <path ref={setRef("crownL")} d="M 392 600 C 355 550 300 510 255 490 C 220 475 195 465 175 445 C 160 430 155 410 155 390" stroke="#5a7a45" strokeWidth="8" strokeLinecap="round" fill="none" strokeOpacity="0.8" />
      <path ref={setRef("crownR")} d="M 408 580 C 445 530 500 490 545 470 C 580 455 605 445 625 425 C 640 410 645 390 643 370" stroke="#5a7a45" strokeWidth="8" strokeLinecap="round" fill="none" strokeOpacity="0.8" />
      <path ref={setRef("crownC")} d="M 400 560 C 400 500 400 440 400 390 C 400 350 400 310 400 280" stroke="#6B8F4E" strokeWidth="7" strokeLinecap="round" fill="none" strokeOpacity="0.7" />
      </g>

      <g opacity={op(0.45)} style={{ transition: "opacity 0.5s" }}>
        {[[20, 1638], [70, 1650], [90, 1572], [130, 1615]].map(([cx, cy], i) => (
          <ellipse key={`fL1-${i}`} cx={cx} cy={cy} rx={30 + i * 5} ry={18 + i * 3} fill="#6B8F4E" fillOpacity={0.16 + i * 0.02} transform={`rotate(${-15 + i * 8},${cx},${cy})`} />
        ))}
        {[[790, 1518], [740, 1530], [730, 1438], [690, 1465]].map(([cx, cy], i) => (
          <ellipse key={`fR1-${i}`} cx={cx} cy={cy} rx={28 + i * 4} ry={16 + i * 3} fill="#4B6E48" fillOpacity={0.16 + i * 0.02} transform={`rotate(${12 - i * 6},${cx},${cy})`} />
        ))}
      </g>

      <g opacity={op(0.25)} style={{ transition: "opacity 0.5s" }}>
        {[[15, 1228], [60, 1240], [60, 1152], [120, 1180]].map(([cx, cy], i) => (
          <ellipse key={`fL2-${i}`} cx={cx} cy={cy} rx={32 + i * 4} ry={18 + i * 2} fill="#6B8F4E" fillOpacity={0.15 + i * 0.02} transform={`rotate(${-12 + i * 7},${cx},${cy})`} />
        ))}
        {[[795, 1088], [750, 1095], [755, 1022], [715, 1033]].map(([cx, cy], i) => (
          <ellipse key={`fR2-${i}`} cx={cx} cy={cy} rx={30 + i * 3} ry={17 + i * 2} fill="#4B6E48" fillOpacity={0.15 + i * 0.02} transform={`rotate(${10 - i * 5},${cx},${cy})`} />
        ))}
      </g>

      <g opacity={op(0.10)} style={{ transition: "opacity 0.6s" }}>
        {[
          [35, 902, 40, 24], [100, 912, 36, 20], [50, 686, 38, 22], [200, 698, 34, 18],
          [772, 806, 38, 22], [700, 816, 32, 18], [748, 608, 36, 20], [650, 618, 30, 16],
          [250, 703, 28, 16], [550, 626, 26, 14],
        ].map(([cx, cy, rx, ry], i) => (
          <ellipse key={`can-${i}`} cx={cx} cy={cy} rx={rx} ry={ry} fill={i % 2 === 0 ? "#6B8F4E" : "#4B6E48"} fillOpacity={0.18} transform={`rotate(${(i % 3 - 1) * 12},${cx},${cy})`} />
        ))}
      </g>

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
        <circle cx="400" cy="350" r="200" fill="url(#crownGlow)" />
        <circle cx="400" cy="300" r="120" fill="url(#leafGlowR)" />
        <circle cx="400" cy="280" r="80" fill="url(#crownGlow)" opacity="0.5" />
        <g opacity="0.08">
          <polygon points="380,200 360,600 370,600" fill="url(#sunRayG)" />
          <polygon points="420,180 440,580 430,580" fill="url(#sunRayG)" />
          <polygon points="340,240 310,550 325,550" fill="url(#sunRayG)" />
          <polygon points="460,220 490,540 475,540" fill="url(#sunRayG)" />
        </g>
      </g>

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
