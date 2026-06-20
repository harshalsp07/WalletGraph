"use client";

import { useRef, useEffect, useId } from "react";

type GraphNode = {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  r: number;
  amp: number;
  speed: number;
  phase: number;
  hub: boolean;
  tint: "em" | "am" | "te";
};

type Edge = { a: number; b: number; cx: number; cy: number };

type Pulse = {
  edge: number;
  t: number;
  dur: number;
  el: SVGCircleElement;
};

type ShootingStar = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  g: SVGGElement;
};

const AURORA_BLOBS = [
  { cls: "a1", dur: 28 },
  { cls: "a2", dur: 34 },
  { cls: "a3", dur: 40 },
  { cls: "a4", dur: 24 },
  { cls: "a5", dur: 36 },
];

export default function ConstellationBackground() {
  const reactId = useId().replace(/:/g, "");
  const skyRef = useRef<HTMLDivElement>(null);
  const bokehRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const mouseRef = useRef({ tx: 0, ty: 0, x: 0, y: 0 });

  useEffect(() => {
    const svg = svgRef.current;
    const bokehWrap = bokehRef.current;
    if (!svg || !bokehWrap) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const svgNS = "http://www.w3.org/2000/svg";

    /* ── Bokeh depth particles ── */
    const bokehEls: HTMLElement[] = [];
    if (!reduced) {
      const tints = ["#6fd193", "#e6cd86", "#5fd0c0", "#4fae72"];
      for (let i = 0; i < 14; i++) {
        const el = document.createElement("span");
        const size = 4 + Math.random() * 13;
        const color = tints[i % tints.length];
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.left = `${Math.random() * 100}%`;
        el.style.top = `${55 + Math.random() * 50}%`;
        el.style.background = color;
        el.style.boxShadow = `0 0 14px 4px ${color}55`;
        el.style.animationDuration = `${16 + Math.random() * 18}s`;
        el.style.animationDelay = `${-Math.random() * 22}s`;
        bokehWrap.appendChild(el);
        bokehEls.push(el);
      }
    }

    /* ── SVG: living trust-graph ── */
    const W = 1200;
    const H = 1200;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid slice");

    const nodeDefs: Array<[number, number, number, boolean, GraphNode["tint"]]> = [
      [600, 150, 4.8, true, "em"],
      [330, 215, 3.2, false, "te"],
      [870, 200, 3.6, false, "am"],
      [200, 365, 2.8, false, "em"],
      [480, 330, 4.4, true, "em"],
      [720, 350, 3.0, false, "te"],
      [985, 380, 2.6, false, "am"],
      [120, 545, 2.4, false, "em"],
      [360, 525, 3.2, false, "am"],
      [600, 470, 5.0, true, "em"],
      [825, 545, 2.9, false, "te"],
      [1045, 625, 2.5, false, "em"],
      [260, 725, 2.7, false, "am"],
      [510, 705, 3.4, false, "em"],
      [745, 755, 2.8, false, "te"],
      [400, 890, 2.6, false, "am"],
      [665, 905, 4.2, true, "em"],
      [925, 865, 2.5, false, "te"],
    ];

    nodesRef.current = nodeDefs.map(([bx, by, r, hub, tint], i) => ({
      baseX: bx,
      baseY: by,
      x: bx,
      y: by,
      r,
      amp: 7 + (i % 3) * 5,
      speed: 0.00035 + (i % 5) * 0.0001,
      phase: i * 1.7,
      hub,
      tint,
    }));

    /* edges with curved (quadratic Bezier) control points */
    const edges: Edge[] = [];
    const nodes = nodesRef.current;
    const N = nodes.length;
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const d = Math.hypot(a.baseX - b.baseX, a.baseY - b.baseY);
        if (d < 265) {
          const mx = (a.baseX + b.baseX) / 2;
          const my = (a.baseY + b.baseY) / 2;
          const dx = b.baseX - a.baseX;
          const dy = b.baseY - a.baseY;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;
          const curve = (edges.length % 2 === 0 ? 1 : -1) * (16 + (d % 28));
          edges.push({ a: i, b: j, cx: mx + nx * curve, cy: my + ny * curve });
        }
      }
    }
    edgesRef.current = edges;

    const gid = `nc-${reactId}`;
    const defs = document.createElementNS(svgNS, "defs");
    defs.innerHTML = `
      <radialGradient id="${gid}-em" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#b6f7cf" stop-opacity="0.95"/>
        <stop offset="35%" stop-color="#4fae72" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="#4fae72" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="${gid}-am" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#f6e09a" stop-opacity="0.9"/>
        <stop offset="45%" stop-color="#d8b25a" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#d8b25a" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="${gid}-te" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#aef4e8" stop-opacity="0.85"/>
        <stop offset="45%" stop-color="#5fd0c0" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#5fd0c0" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="${gid}-star" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#a7f5c4" stop-opacity="0"/>
        <stop offset="80%" stop-color="#a7f5c4" stop-opacity="0.85"/>
        <stop offset="100%" stop-color="#eafff2" stop-opacity="1"/>
      </linearGradient>
      <filter id="${gid}-bloom" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="3" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="${gid}-soft" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="1"/>
      </filter>`;
    svg.appendChild(defs);

    const gGraph = document.createElementNS(svgNS, "g");
    const gEdges = document.createElementNS(svgNS, "g");
    const gRings = document.createElementNS(svgNS, "g");
    const gPulses = document.createElementNS(svgNS, "g");
    const gNodes = document.createElementNS(svgNS, "g");
    const gStars = document.createElementNS(svgNS, "g");
    gGraph.appendChild(gEdges);
    gGraph.appendChild(gRings);
    gGraph.appendChild(gPulses);
    gGraph.appendChild(gNodes);
    svg.appendChild(gGraph);
    svg.appendChild(gStars);

    /* curved edges */
    const edgeEls: SVGPathElement[] = [];
    edges.forEach(() => {
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("stroke", "#5a9a6a");
      path.setAttribute("stroke-width", "1");
      path.setAttribute("stroke-opacity", "0.16");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("fill", "none");
      gEdges.appendChild(path);
      edgeEls.push(path);
    });

    /* nodes: layered glow + halo + core */
    const nodeEls: { glow: SVGCircleElement; halo: SVGCircleElement; core: SVGCircleElement }[] =
      [];
    nodes.forEach((n, i) => {
      const grad = `${gid}-${n.tint}`;
      const coreFill = n.tint === "em" ? "#b6f7cf" : n.tint === "am" ? "#f6e09a" : "#aef4e8";

      const glow = document.createElementNS(svgNS, "circle");
      glow.setAttribute("r", String(n.r * 5.2));
      glow.setAttribute("fill", `url(#${grad})`);
      glow.setAttribute("opacity", n.hub ? "0.5" : "0.38");
      gNodes.appendChild(glow);

      const halo = document.createElementNS(svgNS, "circle");
      halo.setAttribute("r", String(n.r * 2.1));
      halo.setAttribute("fill", `url(#${grad})`);
      halo.setAttribute("opacity", "0.6");
      gNodes.appendChild(halo);

      const core = document.createElementNS(svgNS, "circle");
      core.setAttribute("r", String(n.r * 0.62));
      core.setAttribute("fill", coreFill);
      core.setAttribute("filter", `url(#${gid}-bloom)`);
      core.style.animation = `nc-node-pulse ${3 + (i % 4) * 0.6}s ease-in-out ${i * 0.3}s infinite`;
      gNodes.appendChild(core);

      nodeEls.push({ glow, halo, core });
    });

    /* orbiting hub rings + satellites */
    const hubRings: {
      node: number;
      radius: number;
      dir: number;
      speed: number;
      angle: number;
      ring: SVGCircleElement;
      sat: SVGCircleElement;
      color: string;
    }[] = [];
    nodes.forEach((n, i) => {
      if (!n.hub) return;
      const ringConfigs: Array<[number, number, number, string]> = [
        [n.r * 3.3, 1, 0.18, "#6fd193"],
        [n.r * 4.5, -1, 0.12, "#5fd0c0"],
      ];
      ringConfigs.forEach(([radius, dir, speed, color]) => {
        const ring = document.createElementNS(svgNS, "circle");
        ring.setAttribute("r", String(radius));
        ring.setAttribute("fill", "none");
        ring.setAttribute("stroke", color);
        ring.setAttribute("stroke-width", "1");
        ring.setAttribute("stroke-opacity", "0.4");
        ring.setAttribute("stroke-dasharray", "3 7");
        gRings.appendChild(ring);

        const sat = document.createElementNS(svgNS, "circle");
        sat.setAttribute("r", "1.6");
        sat.setAttribute("fill", color);
        sat.setAttribute("filter", `url(#${gid}-bloom)`);
        gRings.appendChild(sat);

        hubRings.push({
          node: i,
          radius,
          dir,
          speed,
          angle: Math.random() * Math.PI * 2,
          ring,
          sat,
          color,
        });
      });
    });

    /* traveling endorsement pulses along curved edges */
    const pulses: Pulse[] = [];
    const spawnPulse = () => {
      if (pulses.length > 5) return;
      const ei = Math.floor(Math.random() * edges.length);
      const el = document.createElementNS(svgNS, "circle");
      el.setAttribute("r", "2.4");
      el.setAttribute("fill", "#9ff5bf");
      el.setAttribute("filter", `url(#${gid}-bloom)`);
      el.setAttribute("opacity", "0");
      gPulses.appendChild(el);
      pulses.push({ edge: ei, t: 0, dur: 1700 + Math.random() * 1500, el });
    };

    /* shooting stars */
    const stars: ShootingStar[] = [];
    const spawnStar = () => {
      const dirX = 0.62;
      const dirY = 0.78;
      const speed = 7 + Math.random() * 4;
      const x = -80 + Math.random() * (W * 0.55);
      const y = -120 + Math.random() * 120;
      const tailLen = 110 + Math.random() * 70;

      const g = document.createElementNS(svgNS, "g");
      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", String(-dirX * tailLen));
      line.setAttribute("y1", String(-dirY * tailLen));
      line.setAttribute("x2", "0");
      line.setAttribute("y2", "0");
      line.setAttribute("stroke", `url(#${gid}-star)`);
      line.setAttribute("stroke-width", "1.8");
      line.setAttribute("stroke-linecap", "round");
      line.setAttribute("opacity", "0.85");
      g.appendChild(line);

      const head = document.createElementNS(svgNS, "circle");
      head.setAttribute("r", "2.4");
      head.setAttribute("fill", "#eafff2");
      head.setAttribute("filter", `url(#${gid}-bloom)`);
      g.appendChild(head);

      g.setAttribute("opacity", "0");
      gStars.appendChild(g);
      stars.push({ x, y, vx: dirX * speed, vy: dirY * speed, age: 0, life: 1300, g });
    };

    /* mouse parallax */
    const onMove = (e: MouseEvent) => {
      mouseRef.current.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    if (!reduced) window.addEventListener("mousemove", onMove, { passive: true });

    let lastPulse = 0;
    let lastStar = 0;

    const render = (now: number) => {
      if (!startRef.current) startRef.current = now;
      const t = now - startRef.current;

      /* eased parallax */
      const m = mouseRef.current;
      m.x += (m.tx - m.x) * 0.06;
      m.y += (m.ty - m.y) * 0.06;
      gGraph.setAttribute(
        "transform",
        `translate(${(-m.x * 26).toFixed(2)} ${(-m.y * 18).toFixed(2)})`
      );
      gStars.setAttribute(
        "transform",
        `translate(${(-m.x * 46).toFixed(2)} ${(-m.y * 30).toFixed(2)})`
      );
      bokehWrap.style.transform = `translate(${(m.x * 16).toFixed(2)}px, ${(m.y * 10).toFixed(2)}px)`;

      /* breathing nodes */
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x = n.baseX + Math.sin(t * n.speed + n.phase) * n.amp;
        n.y = n.baseY + Math.cos(t * n.speed * 0.8 + n.phase) * n.amp * 0.7;
        const { glow, halo, core } = nodeEls[i];
        glow.setAttribute("cx", String(n.x));
        glow.setAttribute("cy", String(n.y));
        halo.setAttribute("cx", String(n.x));
        halo.setAttribute("cy", String(n.y));
        core.setAttribute("cx", String(n.x));
        core.setAttribute("cy", String(n.y));
      }

      /* curved edges */
      for (let k = 0; k < edgeEls.length; k++) {
        const ed = edges[k];
        const a = nodes[ed.a];
        const b = nodes[ed.b];
        const path = edgeEls[k];
        path.setAttribute("d", `M${a.x} ${a.y} Q${ed.cx} ${ed.cy} ${b.x} ${b.y}`);
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        path.setAttribute("stroke-opacity", String(Math.max(0.05, 0.24 - d / 1700)));
      }

      /* hub orbits */
      for (const r of hubRings) {
        const n = nodes[r.node];
        r.angle += r.speed * 0.01 * r.dir;
        r.ring.setAttribute("cx", String(n.x));
        r.ring.setAttribute("cy", String(n.y));
        const sx = n.x + Math.cos(r.angle) * r.radius;
        const sy = n.y + Math.sin(r.angle) * r.radius;
        r.sat.setAttribute("cx", String(sx));
        r.sat.setAttribute("cy", String(sy));
      }

      /* spawn pulses */
      if (now - lastPulse > 1300 && Math.random() > 0.35) {
        spawnPulse();
        lastPulse = now;
      }
      for (let p = pulses.length - 1; p >= 0; p--) {
        const pu = pulses[p];
        pu.t += 16.6;
        const k = pu.t / pu.dur;
        if (k >= 1) {
          pu.el.remove();
          pulses.splice(p, 1);
          continue;
        }
        const ed = edges[pu.edge];
        const a = nodes[ed.a];
        const b = nodes[ed.b];
        const mt = 1 - k;
        const px = mt * mt * a.x + 2 * mt * k * ed.cx + k * k * b.x;
        const py = mt * mt * a.y + 2 * mt * k * ed.cy + k * k * b.y;
        pu.el.setAttribute("cx", String(px));
        pu.el.setAttribute("cy", String(py));
        pu.el.setAttribute("opacity", String(0.9 * Math.sin(k * Math.PI)));
      }

      /* shooting stars */
      if (now - lastStar > 5200 && Math.random() > 0.5) {
        spawnStar();
        lastStar = now;
      }
      for (let s = stars.length - 1; s >= 0; s--) {
        const st = stars[s];
        st.age += 16.6;
        st.x += st.vx;
        st.y += st.vy;
        st.g.setAttribute("transform", `translate(${st.x} ${st.y})`);
        const k = st.age / st.life;
        if (k >= 1) {
          st.g.remove();
          stars.splice(s, 1);
          continue;
        }
        st.g.setAttribute("opacity", String(Math.sin(k * Math.PI) * 0.95));
      }

      rafRef.current = requestAnimationFrame(render);
    };

    if (reduced) {
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const { glow, halo, core } = nodeEls[i];
        glow.setAttribute("cx", String(n.x));
        glow.setAttribute("cy", String(n.y));
        halo.setAttribute("cx", String(n.x));
        halo.setAttribute("cy", String(n.y));
        core.setAttribute("cx", String(n.x));
        core.setAttribute("cy", String(n.y));
        core.style.animation = "none";
      }
      for (let k = 0; k < edgeEls.length; k++) {
        const ed = edges[k];
        const a = nodes[ed.a];
        const b = nodes[ed.b];
        edgeEls[k].setAttribute("d", `M${a.x} ${a.y} Q${ed.cx} ${ed.cy} ${b.x} ${b.y}`);
      }
    } else {
      rafRef.current = requestAnimationFrame(render);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", onMove);
      bokehEls.forEach((e) => e.remove());
      while (svg.firstChild) svg.removeChild(svg.firstChild);
    };
  }, [reactId]);

  return (
    <div className="nc-sky" aria-hidden="true" ref={skyRef}>
      <div className="nc-aurora">
        {AURORA_BLOBS.map((b) => (
          <div key={b.cls} className={`nc-aurora-blob ${b.cls}`} />
        ))}
        <div className="nc-aurora-sweep" />
      </div>
      <svg ref={svgRef} className="nc-const-svg" />
      <div className="nc-bokeh" ref={bokehRef} />
      <div className="nc-horizon">
        <div className="nc-horizon-grid" />
        <div className="nc-horizon-glow" />
      </div>
      <div className="nc-grain" />
    </div>
  );
}
