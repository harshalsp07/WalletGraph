"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { animate } from "animejs";
import StickyNote from "./StickyNote";

interface ReputationRecord {
  wallet_id: number;
  score: number;
  endorsement_count: number;
  report_count: number;
  last_updated: number;
  is_active: boolean;
}

interface InteractionLog {
  log_id: number;
  target_wallet_id: number;
  is_endorsement: boolean;
  reason: string;
  timestamp: number;
}

interface GraphNode {
  id: string;
  walletId: number;
  type: "center" | "endorsement" | "report";
  log?: InteractionLog;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  radius: number;
  layer: number;
}

const CENTER_RADIUS = 58;
const NODE_RADIUS = 32;
const SPRING_STRENGTH = 0.035;
const DAMPING = 0.82;
const REPULSION = 2500;
const MAX_NODES_PER_TYPE = 12;

// Fixed internal coordinate system for the SVG graph
const GRAPH_CX = 450;
const GRAPH_CY = 350;

interface BranchData {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  seed: number;
  layer: number;
}

function generateBranchPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  seed: number,
  isMain: boolean
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const perpX = -dy / len;
  const perpY = dx / len;

  // Subtle symmetric wobble — keeps endpoints accurate
  const wobble = ((seed * 7) % 11 - 5) * (isMain ? 1.5 : 0.8);

  const cp1x = x1 + dx * 0.33 + perpX * wobble;
  const cp1y = y1 + dy * 0.33 + perpY * wobble;
  const cp2x = x1 + dx * 0.66 - perpX * wobble * 0.6;
  const cp2y = y1 + dy * 0.66 - perpY * wobble * 0.6;

  return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
}

// ── Ink Path Generator (Organic Branch-Like) ─────────────────────

function generateInkPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  seed: number
): string {
  return generateBranchPath(x1, y1, x2, y2, seed, false);
}

// ── Score Arc Generator ─────────────────────────────────────────

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number
) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// ── Main Component ──────────────────────────────────────────────

export default function GraphVisualization({
  reputation,
  walletHistory,
}: {
  reputation: ReputationRecord | null;
  walletHistory: InteractionLog[];
  walletAddress?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const animRef = useRef<number | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 900, height: 700 });
  const [selectedNode, setSelectedNode] = useState<{
    node: GraphNode;
    /** Screen-space anchor for the detail card (not SVG user units) */
    anchor: { x: number; y: number };
  } | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [nodesReady, setNodesReady] = useState(false);

  // Zoom/pan state — viewBox is calculated from containerSize and zoom
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // Derived viewBox — always centered on graph center with pan/zoom applied
  const viewBox = useMemo(() => {
    const w = containerSize.width / zoom;
    const h = containerSize.height / zoom;
    return {
      x: GRAPH_CX - w / 2 + panOffset.x,
      y: GRAPH_CY - h / 2 + panOffset.y,
      w,
      h,
    };
  }, [containerSize, zoom, panOffset]);

  // ── Container sizing ──────────────────────────────────────────

  useEffect(() => {
    let timeoutId: number;
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const w = rect.width > 0 ? rect.width : window.innerWidth;
        const h = rect.height > 0 ? rect.height : window.innerHeight;
        setContainerSize({ width: w, height: h });
      }
    };
    updateSize();
    timeoutId = window.setTimeout(updateSize, 100);
    window.addEventListener("resize", updateSize);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  // Use fixed graph center for node positions
  const centerX = GRAPH_CX;
  const centerY = GRAPH_CY;

  // ── Build graph nodes ─────────────────────────────────────────

  const endorsements = useMemo(
    () =>
      walletHistory
        .filter((l) => l.is_endorsement)
        .slice(0, MAX_NODES_PER_TYPE),
    [walletHistory]
  );
  const reports = useMemo(
    () =>
      walletHistory
        .filter((l) => !l.is_endorsement)
        .slice(0, MAX_NODES_PER_TYPE),
    [walletHistory]
  );

  const nodes = useRef<GraphNode[]>([]);

  useEffect(() => {
    const newNodes: GraphNode[] = [];

    // Center node (the "root" of our tree)
    newNodes.push({
      id: "center",
      walletId: reputation?.wallet_id || 0,
      type: "center",
      x: centerX,
      y: centerY,
      vx: 0,
      vy: 0,
      targetX: centerX,
      targetY: centerY,
      radius: CENTER_RADIUS,
      layer: 0,
    });

    const totalNodes = endorsements.length + reports.length;
    const baseRadius = Math.max(180, 60 + totalNodes * 15);
    const layerSpread = 55;

    endorsements.forEach((log, index) => {
      const total = endorsements.length;
      const layer = Math.floor(index / 6);
      const angleOffset = ((seed: number) => ((seed * 7) % 17 - 8) * 3)(index);
      const baseAngle = -130 + (160 / (total + 1)) * (index + 1);
      const angle = ((baseAngle + angleOffset) * Math.PI) / 180;
      const radius = baseRadius + layer * layerSpread + ((seed: number) => (seed * 13) % 23)(index) * 8;
      const targetX = centerX + Math.cos(angle) * radius;
      const targetY = centerY + Math.sin(angle) * radius;

      newNodes.push({
        id: `end-${log.log_id}`,
        walletId: log.target_wallet_id,
        type: "endorsement",
        log,
        x: centerX + (Math.random() - 0.5) * 40,
        y: centerY + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
        targetX,
        targetY,
        radius: NODE_RADIUS,
        layer,
      });
    });

    reports.forEach((log, index) => {
      const total = reports.length;
      const layer = Math.floor(index / 6);
      const angleOffset = ((seed: number) => ((seed * 11) % 19 - 9) * 3)(index);
      const baseAngle = 50 + (100 / (total + 1)) * (index + 1);
      const angle = ((baseAngle + angleOffset) * Math.PI) / 180;
      const radius = baseRadius + layer * layerSpread + ((seed: number) => (seed * 17) % 29)(index) * 8;
      const targetX = centerX + Math.cos(angle) * radius;
      const targetY = centerY + Math.sin(angle) * radius;

      newNodes.push({
        id: `report-${log.log_id}`,
        walletId: log.target_wallet_id,
        type: "report",
        log,
        x: centerX + (Math.random() - 0.5) * 40,
        y: centerY + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
        targetX,
        targetY,
        radius: NODE_RADIUS,
        layer,
      });
    });

    nodes.current = newNodes;
    setNodesReady(false);

    // Physics simulation
    let frame = 0;
    const maxFrames = 120;

    const simulate = () => {
      const ns = nodes.current;
      for (let i = 0; i < ns.length; i++) {
        const n = ns[i];
        if (n.type === "center") continue;

        // Spring to target
        const dx = n.targetX - n.x;
        const dy = n.targetY - n.y;
        n.vx += dx * SPRING_STRENGTH;
        n.vy += dy * SPRING_STRENGTH;

        // Repulsion from other nodes
        for (let j = 0; j < ns.length; j++) {
          if (i === j) continue;
          const ox = n.x - ns[j].x;
          const oy = n.y - ns[j].y;
          const dist = Math.sqrt(ox * ox + oy * oy) || 1;
          const minDist = n.radius + ns[j].radius + 12;
          if (dist < minDist * 2.5) {
            const force = REPULSION / (dist * dist);
            n.vx += (ox / dist) * force;
            n.vy += (oy / dist) * force;
          }
        }

        // Damping
        n.vx *= DAMPING;
        n.vy *= DAMPING;

        // Update position
        n.x += n.vx;
        n.y += n.vy;
      }

      frame++;
      if (frame < maxFrames) {
        animRef.current = requestAnimationFrame(simulate);
      } else {
        setNodesReady(true);
      }
    };

    animRef.current = requestAnimationFrame(simulate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [endorsements, reports, centerX, centerY, reputation]);

  // Force re-render during simulation
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    if (nodesReady) return;
    const interval = setInterval(() => forceUpdate((n) => n + 1), 33);
    return () => clearInterval(interval);
  }, [nodesReady]);

  // ── Animate paths after simulation settles ────────────────────

  useEffect(() => {
    if (!nodesReady) return;

    const allPaths = document.querySelectorAll(".graph-ink-line");
    allPaths.forEach((path, i) => {
      const el = path as SVGPathElement;
      const length = el.getTotalLength();
      el.style.strokeDasharray = `${length}`;
      el.style.strokeDashoffset = `${length}`;

      animate(el, {
        strokeDashoffset: [length, 0],
        duration: 900,
        easing: "easeOutQuad",
        delay: 100 + i * 60,
      });
    });

    // Animate nodes
    const nodeEls = document.querySelectorAll(".graph-node-group");
    nodeEls.forEach((el, i) => {
      const targetScale = el.getAttribute("data-scale") ? parseFloat(el.getAttribute("data-scale")!) : 1;
      animate(el, {
        opacity: [0, 1],
        scale: [0.3, targetScale],
        duration: 600,
        easing: "easeOutBack",
        delay: 200 + i * 50,
      });
    });
  }, [nodesReady]);

  // ── Zoom handler ──────────────────────────────────────────────

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
      const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.4), 3);
      setZoom(newZoom);
    },
    [zoom]
  );

  // ── Pan handlers ──────────────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setIsPanning(true);
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        vx: panOffset.x,
        vy: panOffset.y,
      };
    },
    [panOffset]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      const scale = 1 / zoom;
      setPanOffset({
        x: panStart.current.vx - dx * scale,
        y: panStart.current.vy - dy * scale,
      });
    },
    [isPanning, zoom]
  );

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  // ── Click handler ─────────────────────────────────────────────

  const svgNodeToClient = useCallback((x: number, y: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = x;
    pt.y = y;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm);
    return { x: p.x, y: p.y };
  }, []);

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      if (node.type === "center") return;
      const anchor = svgNodeToClient(node.x, node.y);
      setSelectedNode({ node, anchor });
    },
    [svgNodeToClient]
  );

  // ── Score visuals ─────────────────────────────────────────────

  const score = reputation?.score || 0;
  const scoreColor =
    score > 0
      ? "var(--forest)"
      : score < 0
      ? "var(--terra)"
      : "var(--amber-sap)";
  const scoreLabel =
    score > 0 ? "Trusted" : score < 0 ? "Flagged" : "Neutral";

  const endorseCount = reputation?.endorsement_count || 0;
  const reportCount = reputation?.report_count || 0;
  const totalInteractions = endorseCount + reportCount;
  const endorseAngle =
    totalInteractions > 0
      ? (endorseCount / totalInteractions) * 360
      : 180;

  const currentNodes = nodes.current;

  return (
    <div
      ref={containerRef}
      className="w-full h-[calc(100vh-2rem)] sm:h-screen relative"
      style={{ cursor: isPanning ? "grabbing" : "grab" }}
    >
      {/* Nature-inspired forest background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 50% 0%, rgba(75, 110, 72, 0.06) 0%, transparent 50%),
            radial-gradient(ellipse at 20% 80%, rgba(107, 143, 78, 0.04) 0%, transparent 40%),
            radial-gradient(ellipse at 80% 70%, rgba(160, 82, 45, 0.03) 0%, transparent 35%),
            radial-gradient(ellipse at 50% 100%, rgba(178, 172, 136, 0.08) 0%, transparent 50%)
          `,
        }}
      />
      
      {/* Ground/roots texture */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: `linear-gradient(to top, rgba(178, 172, 136, 0.06) 0%, transparent 100%)`,
        }}
      />

      {/* SVG Graph */}
      <svg
        ref={svgRef}
        className="w-full h-full"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ overflow: "visible" }}
      >
        <defs>
          {/* Ink texture filter */}
          <filter
            id="ink-filter"
            x="-10%"
            y="-10%"
            width="120%"
            height="120%"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.03"
              numOctaves="4"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="1.5"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>

          {/* Paper shadow */}
          <filter id="node-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow
              dx="0"
              dy="3"
              stdDeviation="4"
              floodColor="rgba(44,44,43,0.12)"
            />
          </filter>

          {/* Center glow */}
          <filter id="center-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Organic bark texture for branches */}
          <filter id="bark-texture" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.05"
              numOctaves="3"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="1.5"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>

          {/* Leaf shape for endorsements */}
          <filter id="leaf-filter" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.08"
              numOctaves="2"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="2"
            />
          </filter>

          {/* Soft nature glow */}
          <filter id="nature-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Gradients */}
          <radialGradient id="glow-forest" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--forest)" stopOpacity="0.3" />
            <stop offset="60%" stopColor="var(--moss)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--forest)" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="glow-terra" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--terra)" stopOpacity="0.3" />
            <stop offset="60%" stopColor="#c4754a" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--terra)" stopOpacity="0" />
          </radialGradient>

          {/* Branch-like gradient lines - organic nature feel */}
          <linearGradient id="line-forest" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--forest)" stopOpacity="0.08" />
            <stop offset="30%" stopColor="var(--forest)" stopOpacity="0.4" />
            <stop offset="70%" stopColor="var(--moss)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--forest)" stopOpacity="0.25" />
          </linearGradient>

          <linearGradient id="line-terra" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--terra)" stopOpacity="0.08" />
            <stop offset="30%" stopColor="var(--terra)" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#c4754a" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--terra)" stopOpacity="0.25" />
          </linearGradient>

          {/* Center node gradient - like tree trunk */}
          <radialGradient id="trunk-gradient" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="var(--warm-cream)" />
            <stop offset="70%" stopColor="var(--light-sage)" />
            <stop offset="100%" stopColor="var(--faded-sage)" />
          </radialGradient>

          {/* Leaf node gradient */}
          <radialGradient id="leaf-gradient" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="var(--warm-cream)" />
            <stop offset="100%" stopColor="var(--light-sage)" />
          </radialGradient>
        </defs>

        {/* Grid dots background */}
        <pattern
          id="grid-dots"
          x="0"
          y="0"
          width="30"
          height="30"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="15" cy="15" r="0.6" fill="var(--faded-sage)" opacity="0.4" />
        </pattern>
        <rect
          x={viewBox.x - 100}
          y={viewBox.y - 100}
          width={viewBox.w + 200}
          height={viewBox.h + 200}
          fill="url(#grid-dots)"
        />

        {/* Organic branch-like connections */}
        {currentNodes
          .filter((n) => n.type !== "center")
          .map((node, idx) => {
            const center = currentNodes[0];
            const isFocused =
              hoveredNode === node.id ||
              selectedNode?.node.id === node.id;
            const isEndorsement = node.type === "endorsement";
            const seed = node.log?.log_id || 0;
            const layer = node.layer || 0;
            const layerWidth = 1.2 + layer * 0.3;
            const layerScale = 1 - layer * 0.08;

            // Compute edge-to-edge endpoints so lines don't
            // overlap the circles
            const dx = node.x - center.x;
            const dy = node.y - center.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const ux = dx / dist;
            const uy = dy / dist;

            // Start at center node edge, end at leaf node edge
            const effectiveNodeRadius = NODE_RADIUS * layerScale;
            const startX = center.x + ux * (CENTER_RADIUS + 2);
            const startY = center.y + uy * (CENTER_RADIUS + 2);
            const endX = node.x - ux * (effectiveNodeRadius + 2);
            const endY = node.y - uy * (effectiveNodeRadius + 2);

            return (
              <g key={`line-${node.id}`}>
                {/* Branch shadow/depth */}
                <path
                  d={generateBranchPath(
                    startX,
                    startY,
                    endX,
                    endY,
                    seed,
                    true
                  )}
                  fill="none"
                  stroke="rgba(44,44,43,0.03)"
                  strokeWidth={layerWidth * 3}
                  strokeLinecap="round"
                />
                
                {/* Secondary branch layer */}
                <path
                  d={generateBranchPath(
                    startX,
                    startY,
                    endX,
                    endY,
                    seed + 5,
                    false
                  )}
                  fill="none"
                  stroke={
                    isEndorsement ? "var(--moss)" : "var(--terra)"
                  }
                  strokeOpacity="0.08"
                  strokeWidth={layerWidth * 1.8}
                  strokeLinecap="round"
                />

                {/* Main branch connection */}
                {isFocused && (
                  <path
                    d={generateBranchPath(
                      startX,
                      startY,
                      endX,
                      endY,
                      seed,
                      true
                    )}
                    fill="none"
                    stroke={
                      isEndorsement ? "var(--forest)" : "var(--terra)"
                    }
                    strokeWidth="5"
                    strokeOpacity="0.15"
                    strokeLinecap="round"
                    filter="url(#nature-glow)"
                  />
                )}

                {/* Main ink line */}
                <path
                  d={generateBranchPath(
                    startX,
                    startY,
                    endX,
                    endY,
                    seed,
                    false
                  )}
                  fill="none"
                  stroke={
                    isEndorsement
                      ? "url(#line-forest)"
                      : "url(#line-terra)"
                  }
                  strokeWidth={isFocused ? 2.8 : layerWidth}
                  strokeLinecap="round"
                  className="graph-ink-line"
                  style={{
                    transition: "stroke-width 0.2s ease",
                  }}
                />
              </g>
            );
          })}

        {/* Endorsement & Report nodes - Nature "leaves" and "fruits" */}
        {currentNodes
          .filter((n) => n.type !== "center")
          .map((node) => {
            const center = currentNodes[0];
            const isEndorsement = node.type === "endorsement";
            const isHovered = hoveredNode === node.id;
            const isSelected = selectedNode?.node.id === node.id;
            const isFocused = isHovered || isSelected;
            const color = isEndorsement
              ? "var(--forest)"
              : "var(--terra)";
            const layer = node.layer || 0;
            const layerScale = 1 - layer * 0.08;
            const rdx = node.x - center.x;
            const rdy = node.y - center.y;
            const rlen = Math.hypot(rdx, rdy) || 1;
            const ux = rdx / rlen;
            const uy = rdy / rlen;
            const tipDist = NODE_RADIUS + 26;
            const tipX = ux * tipDist;
            const tipY = uy * tipDist;

            return (
              <g
                key={`node-${node.id}`}
                style={{ cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleNodeClick(node);
                }}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                transform={`translate(${node.x}, ${node.y})`}
              >
                <g
                  className="graph-node-group"
                  data-scale={layerScale}
                  style={{ opacity: 0, transform: `scale(${layerScale})`, transformOrigin: "center" }}
                >
                {/* Outer aura/glow */}
                <circle
                  r={NODE_RADIUS + 12}
                  fill={
                    isEndorsement
                      ? "url(#glow-forest)"
                      : "url(#glow-terra)"
                  }
                  opacity={isFocused ? 0.9 : 0.3}
                  style={{ transition: "opacity 0.3s ease" }}
                />

                {/* Node background - leaf-like shape */}
                <circle
                  r={NODE_RADIUS}
                  fill="url(#leaf-gradient)"
                  stroke={color}
                  strokeWidth={isFocused ? 2.5 : 1.2}
                  filter="url(#node-shadow)"
                  style={{
                    transition: "all 0.25s ease",
                    transform: isFocused ? "scale(1.12)" : "scale(1)",
                    transformOrigin: "center",
                  }}
                />

                {/* Inner decorative ring - leaf vein pattern */}
                <circle
                  r={NODE_RADIUS - 6}
                  fill="none"
                  stroke={color}
                  strokeWidth="0.4"
                  strokeOpacity="0.15"
                  strokeDasharray="4 4"
                />

                {/* Icon */}
                {isEndorsement ? (
                  <g transform="translate(-8, -10)">
                    <path
                      d="M5 7v8M10 3.9 9.33 7h3.89a1.33 1.33 0 0 1 1.28 1.7l-1.55 5.34A1.33 1.33 0 0 1 11.67 15H2.67A1.33 1.33 0 0 1 1.33 13.67V7.67A1.33 1.33 0 0 1 2.67 6.33h1.84a1.33 1.33 0 0 0 1.19-.74L8 1.33a2.09 2.09 0 0 1 2 2.59Z"
                      fill="none"
                      stroke={color}
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                ) : (
                  <g transform="translate(-8, -10)">
                    <path
                      d="M2.67 10s.67-.67 2.67-.67 3.33 1.33 5.33 1.33 2.67-.67 2.67-.67V2s-.67.67-2.67.67S7.33.67 5.33.67 2.67 1.33 2.67 1.33z"
                      fill="none"
                      stroke={color}
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <line
                      x1="2.67"
                      y1="14.67"
                      x2="2.67"
                      y2="10"
                      stroke={color}
                      strokeWidth="1.2"
                    />
                  </g>
                )}

                {/* Wallet ID — below the circle so stems and hub labels stay readable */}
                <text
                  textAnchor="middle"
                  y={NODE_RADIUS + 12}
                  className="font-mono-data"
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    paintOrder: "stroke fill",
                    stroke: "var(--warm-cream)",
                    strokeWidth: "4px",
                    strokeLinejoin: "round",
                  }}
                  fill={color}
                >
                  #{node.walletId}
                </text>

                {/* Hover preview: offset outward along the branch, away from the hub */}
                {isFocused && node.log && (
                  <g transform={`translate(${tipX}, ${tipY})`}>
                    <rect
                      x={-68}
                      y={-13}
                      width={136}
                      height={26}
                      rx={8}
                      fill="var(--warm-cream)"
                      fillOpacity="0.96"
                      stroke={color}
                      strokeWidth="1"
                      strokeOpacity="0.35"
                      filter="url(#node-shadow)"
                    />
                    <text
                      textAnchor="middle"
                      y={4}
                      fill="var(--dark-ink)"
                      style={{ fontSize: "10px", fontWeight: 600 }}
                    >
                      {node.log.reason.length > 22
                        ? node.log.reason.slice(0, 22) + "…"
                        : node.log.reason}
                    </text>
                  </g>
                )}
              </g>
            </g>
          );
        })}

        {/* Center node - the "tree trunk" root */}
        {currentNodes.length > 0 && (
          <g transform={`translate(${currentNodes[0].x}, ${currentNodes[0].y})`}>
            {/* Outer aura - like canopy glow */}
            <circle
              r={CENTER_RADIUS + 28}
              fill={
                score >= 0 ? "url(#glow-forest)" : "url(#glow-terra)"
              }
              opacity="0.5"
            >
              <animate
                attributeName="r"
                values={`${CENTER_RADIUS + 20};${CENTER_RADIUS + 32};${CENTER_RADIUS + 20}`}
                dur="4s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.35;0.6;0.35"
                dur="4s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Inner subtle glow */}
            <circle
              r={CENTER_RADIUS + 12}
              fill={
                score >= 0 ? "var(--forest)" : "var(--terra)"
              }
              opacity="0.06"
            />

            {/* Score rings - like tree rings */}
            {totalInteractions > 0 && (
              <>
                <path
                  d={describeArc(0, 0, CENTER_RADIUS + 8, 0, endorseAngle)}
                  fill="none"
                  stroke="var(--forest)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  opacity="0.5"
                />
                <path
                  d={describeArc(
                    0,
                    0,
                    CENTER_RADIUS + 8,
                    endorseAngle,
                    360
                  )}
                  fill="none"
                  stroke="var(--terra)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  opacity="0.5"
                />
              </>
            )}

            {/* Main circle - trunk-like gradient */}
            <circle
              r={CENTER_RADIUS}
              fill="url(#trunk-gradient)"
              stroke={scoreColor}
              strokeWidth="2.5"
              filter="url(#node-shadow)"
            />

            {/* Inner ring - bark texture effect */}
            <circle
              r={CENTER_RADIUS - 10}
              fill="none"
              stroke={scoreColor}
              strokeWidth="0.4"
              strokeOpacity="0.15"
              strokeDasharray="5 5"
            />

            {/* Wallet ID */}
            <text
              textAnchor="middle"
              dominantBaseline="middle"
              y={-14}
              className="font-mono-data"
              style={{ fontSize: "11px", fontWeight: 700 }}
              fill="var(--dark-ink)"
            >
              WALLET #{reputation?.wallet_id || "?"}
            </text>

            {/* Score - main trunk display */}
            <text
              textAnchor="middle"
              dominantBaseline="middle"
              y={10}
              style={{
                fontSize: "28px",
                fontWeight: 800,
                fontFamily: "var(--font-serif), Playfair Display, Georgia, serif",
              }}
              fill={scoreColor}
            >
              {score > 0 ? `+${score}` : score}
            </text>

            {/* Label */}
            <text
              textAnchor="middle"
              y={32}
              className="font-mono-data"
              style={{
                fontSize: "8px",
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
              fill="var(--stone)"
            >
              {scoreLabel}
            </text>
          </g>
        )}
      </svg>

      {/* ── Legend Panel ── */}
      <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 z-10">
        <div className="card-botanical shadow-paper-lg px-4 sm:px-5 py-3 sm:py-4 space-y-2 sm:space-y-3 backdrop-blur-sm">
          <p
            className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[var(--stone)]"
            style={{ marginBottom: 8 }}
          >
            Legend
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[var(--forest)] shadow-[0_0_6px_rgba(75,110,72,0.4)]" />
              <span className="text-xs text-[var(--dark-ink)] font-medium">
                Endorsement
              </span>
            </div>
            <div className="h-4 w-px bg-[var(--faded-sage)]" />
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[var(--terra)] shadow-[0_0_6px_rgba(160,82,45,0.4)]" />
              <span className="text-xs text-[var(--dark-ink)] font-medium">
                Report
              </span>
            </div>
          </div>
          <div className="pt-1 border-t border-[var(--faded-sage)]/50 space-y-1">
            <p className="text-[9px] text-[var(--stone)] uppercase tracking-wider">
              On-chain ledger
            </p>
            <div className="flex items-center gap-3 text-[10px] text-[var(--stone)] font-mono-data">
              <span className="text-[var(--forest)] font-bold">
                +{endorseCount}
              </span>
              <span className="text-[var(--terra)] font-bold">
                −{reportCount}
              </span>
              <span className="text-[var(--dark-ink)] font-semibold">
                → {score}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Panel ── */}
      {reputation && (
        <div className="absolute top-20 sm:top-6 right-4 sm:right-6 z-10 w-[180px] sm:max-w-[220px]">
          <div className="card-botanical shadow-paper-lg px-4 sm:px-5 py-4 sm:py-5 space-y-3 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--forest)]/30 to-transparent pointer-events-none" />
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  reputation.is_active
                    ? "bg-[var(--forest)]"
                    : "bg-[var(--terra)]"
                }`}
              />
              <span className="text-xs font-semibold text-[var(--dark-ink)]">
                {reputation.is_active ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div className="rounded-lg bg-[var(--parchment)]/60 px-3 py-2 border border-[var(--faded-sage)]/35">
                <p className="text-[9px] uppercase tracking-wider text-[var(--stone)] mb-0.5">
                  Score
                </p>
                <p
                  className="text-xl font-heading font-bold tabular-nums leading-tight"
                  style={{ color: scoreColor }}
                >
                  {score > 0 ? `+${score}` : score}
                </p>
              </div>
              <div className="rounded-lg bg-[var(--parchment)]/60 px-3 py-2 border border-[var(--faded-sage)]/35">
                <p className="text-[9px] uppercase tracking-wider text-[var(--stone)] mb-0.5">
                  Status
                </p>
                <p
                  className="text-lg font-heading font-bold leading-tight"
                  style={{ color: scoreColor }}
                >
                  {scoreLabel}
                </p>
              </div>
              <div className="rounded-lg bg-[var(--forest)]/6 px-3 py-2 border border-[var(--forest)]/15">
                <p className="text-[9px] uppercase tracking-wider text-[var(--stone)] mb-0.5">
                  Endorsements
                </p>
                <p className="text-base font-mono-data font-bold text-[var(--forest)] tabular-nums">
                  {endorseCount}
                </p>
              </div>
              <div className="rounded-lg bg-[var(--terra)]/6 px-3 py-2 border border-[var(--terra)]/15">
                <p className="text-[9px] uppercase tracking-wider text-[var(--stone)] mb-0.5">
                  Reports
                </p>
                <p className="text-base font-mono-data font-bold text-[var(--terra)] tabular-nums">
                  {reportCount}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--faded-sage)]/50">
              <p className="text-[9px] text-[var(--stone)] font-mono-data">
                Ledger #{reputation.last_updated}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Zoom Controls ── */}
      <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-1">
        <button
          onClick={() => setZoom(z => Math.min(z * 1.3, 3))}
          className="w-9 h-9 card-botanical flex items-center justify-center text-[var(--dark-ink)] hover:text-[var(--forest)] hover:bg-[var(--forest)]/5 transition-all cursor-pointer text-lg font-bold"
        >
          +
        </button>
        <button
          onClick={() => setZoom(z => Math.max(z * 0.7, 0.4))}
          className="w-9 h-9 card-botanical flex items-center justify-center text-[var(--dark-ink)] hover:text-[var(--forest)] hover:bg-[var(--forest)]/5 transition-all cursor-pointer text-lg font-bold"
        >
          −
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setPanOffset({ x: 0, y: 0 });
          }}
          className="w-9 h-9 card-botanical flex items-center justify-center text-[var(--stone)] hover:text-[var(--forest)] hover:bg-[var(--forest)]/5 transition-all cursor-pointer"
          title="Reset zoom"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </div>

      {/* ── Empty state ── */}
      {walletHistory.length === 0 && reputation && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="card-botanical px-8 py-6 text-center opacity-90 max-w-xs">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[var(--faded-sage)]/20 flex items-center justify-center">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--stone)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="5" r="3" />
                <circle cx="5" cy="19" r="3" />
                <circle cx="19" cy="19" r="3" />
                <line x1="12" y1="8" x2="5" y2="16" />
                <line x1="12" y1="8" x2="19" y2="16" />
              </svg>
            </div>
            <p className="text-sm font-heading font-bold text-[var(--dark-ink)] mb-1">
              No Interactions Yet
            </p>
            <p className="text-xs text-[var(--stone)] leading-relaxed">
              This wallet hasn't received any endorsements or reports. Be the
              first to build its reputation graph.
            </p>
          </div>
        </div>
      )}

      {/* ── Sticky Note ── */}
      {selectedNode && (
        <StickyNote
          log={selectedNode.node.log!}
          type={selectedNode.node.type}
          anchor={selectedNode.anchor}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}