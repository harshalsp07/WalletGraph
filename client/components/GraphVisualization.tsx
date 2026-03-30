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
}

interface NodePosition {
  x: number;
  y: number;
}

// ── Constants ────────────────────────────────────────────────────

const CENTER_RADIUS = 58;
const NODE_RADIUS = 32;
const ORBIT_RADIUS_ENDORSE = 220;
const ORBIT_RADIUS_REPORT = 220;
const SPRING_STRENGTH = 0.04;
const DAMPING = 0.85;
const REPULSION = 2000;
const MAX_NODES_PER_TYPE = 12;

// ── Ink Path Generator ──────────────────────────────────────────

function generateInkPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  seed: number
): string {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const perpX = -dy / len;
  const perpY = dx / len;

  const wobble1 = ((seed * 7) % 11 - 5) * 1.5;
  const wobble2 = ((seed * 13) % 9 - 4) * 1.2;

  const cp1x = x1 + (x2 - x1) * 0.3 + perpX * wobble1;
  const cp1y = y1 + (y2 - y1) * 0.3 + perpY * wobble1;
  const cp2x = x1 + (x2 - x1) * 0.7 + perpX * wobble2;
  const cp2y = y1 + (y2 - y1) * 0.7 + perpY * wobble2;

  return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
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
    position: NodePosition;
  } | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [nodesReady, setNodesReady] = useState(false);

  // Zoom/pan state
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 900, h: 700 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const [zoom, setZoom] = useState(1);

  // ── Container sizing ──────────────────────────────────────────

  useEffect(() => {
    let timeoutId: number;
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const w = rect.width > 0 ? rect.width : window.innerWidth;
        const h = rect.height > 0 ? rect.height : window.innerHeight;
        setContainerSize({ width: w, height: h });
        setViewBox(prev => ({ ...prev, w, h }));
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

  const centerX = containerSize.width / 2;
  const centerY = containerSize.height / 2;

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

    // Center node
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
    });

    // Endorsement nodes — left semi-circle
    endorsements.forEach((log, index) => {
      const angle =
        -140 + (280 / (endorsements.length + 1)) * (index + 1) - 70;
      const rad = (angle * Math.PI) / 180;
      const targetX = centerX + Math.cos(rad) * ORBIT_RADIUS_ENDORSE;
      const targetY = centerY + Math.sin(rad) * ORBIT_RADIUS_ENDORSE;

      // Start at center for animation
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
      });
    });

    // Report nodes — right semi-circle
    reports.forEach((log, index) => {
      const angle = 40 + (100 / (reports.length + 1)) * (index + 1);
      const rad = (angle * Math.PI) / 180;
      const targetX = centerX + Math.cos(rad) * ORBIT_RADIUS_REPORT;
      const targetY = centerY + Math.sin(rad) * ORBIT_RADIUS_REPORT;

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
      animate(el, {
        opacity: [0, 1],
        scale: [0.3, 1],
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

      const svgRect = svgRef.current?.getBoundingClientRect();
      if (!svgRect) return;
      const mouseX =
        ((e.clientX - svgRect.left) / svgRect.width) * viewBox.w + viewBox.x;
      const mouseY =
        ((e.clientY - svgRect.top) / svgRect.height) * viewBox.h + viewBox.y;

      const newW = containerSize.width / newZoom;
      const newH = containerSize.height / newZoom;
      const newX = mouseX - (mouseX - viewBox.x) * (newW / viewBox.w);
      const newY = mouseY - (mouseY - viewBox.y) * (newH / viewBox.h);

      setViewBox({ x: newX, y: newY, w: newW, h: newH });
      setZoom(newZoom);
    },
    [zoom, viewBox, containerSize]
  );

  // ── Pan handlers ──────────────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setIsPanning(true);
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        vx: viewBox.x,
        vy: viewBox.y,
      };
    },
    [viewBox]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      const scale = viewBox.w / containerSize.width;
      setViewBox((v) => ({
        ...v,
        x: panStart.current.vx - dx * scale,
        y: panStart.current.vy - dy * scale,
      }));
    },
    [isPanning, viewBox.w, containerSize.width]
  );

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  // ── Click handler ─────────────────────────────────────────────

  const handleNodeClick = useCallback((node: GraphNode) => {
    if (node.type === "center") return;
    setSelectedNode({
      node,
      position: { x: node.x, y: node.y },
    });
  }, []);

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
      className="w-full h-screen relative"
      style={{ cursor: isPanning ? "grabbing" : "grab" }}
    >
      {/* Paper texture background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 30% 40%, rgba(75, 110, 72, 0.03) 0%, transparent 60%),
            radial-gradient(ellipse at 70% 60%, rgba(160, 82, 45, 0.02) 0%, transparent 50%)
          `,
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

          {/* Gradients */}
          <radialGradient id="glow-forest" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--forest)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--forest)" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="glow-terra" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--terra)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--terra)" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="line-forest" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--forest)" stopOpacity="0.15" />
            <stop offset="50%" stopColor="var(--forest)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--forest)" stopOpacity="0.3" />
          </linearGradient>

          <linearGradient id="line-terra" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--terra)" stopOpacity="0.15" />
            <stop offset="50%" stopColor="var(--terra)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--terra)" stopOpacity="0.3" />
          </linearGradient>
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

        {/* Connection lines */}
        {currentNodes
          .filter((n) => n.type !== "center")
          .map((node) => {
            const center = currentNodes[0];
            const isFocused =
              hoveredNode === node.id ||
              selectedNode?.node.id === node.id;
            const isEndorsement = node.type === "endorsement";
            const seed = node.log?.log_id || 0;

            return (
              <g key={`line-${node.id}`}>
                {/* Connection glow on hover */}
                {isFocused && (
                  <path
                    d={generateInkPath(
                      center.x,
                      center.y,
                      node.x,
                      node.y,
                      seed
                    )}
                    fill="none"
                    stroke={
                      isEndorsement ? "var(--forest)" : "var(--terra)"
                    }
                    strokeWidth="6"
                    strokeOpacity="0.12"
                    strokeLinecap="round"
                  />
                )}

                {/* Main ink line */}
                <path
                  d={generateInkPath(
                    center.x,
                    center.y,
                    node.x,
                    node.y,
                    seed
                  )}
                  fill="none"
                  stroke={
                    isEndorsement
                      ? "url(#line-forest)"
                      : "url(#line-terra)"
                  }
                  strokeWidth={isFocused ? 2.5 : 1.5}
                  strokeLinecap="round"
                  className="graph-ink-line"
                  style={{
                    transition: "stroke-width 0.2s ease",
                  }}
                />

                {/* Arrow dot at node end */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={3}
                  fill={
                    isEndorsement ? "var(--forest)" : "var(--terra)"
                  }
                  opacity={isFocused ? 0.8 : 0.4}
                />
              </g>
            );
          })}

        {/* Endorsement & Report nodes */}
        {currentNodes
          .filter((n) => n.type !== "center")
          .map((node) => {
            const isEndorsement = node.type === "endorsement";
            const isHovered = hoveredNode === node.id;
            const isSelected = selectedNode?.node.id === node.id;
            const isFocused = isHovered || isSelected;
            const color = isEndorsement
              ? "var(--forest)"
              : "var(--terra)";

            return (
              <g
                key={`node-${node.id}`}
                className="graph-node-group"
                style={{ cursor: "pointer", opacity: 0 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleNodeClick(node);
                }}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                transform={`translate(${node.x}, ${node.y})`}
              >
                {/* Hover glow */}
                <circle
                  r={NODE_RADIUS + 8}
                  fill={
                    isEndorsement
                      ? "url(#glow-forest)"
                      : "url(#glow-terra)"
                  }
                  opacity={isFocused ? 1 : 0}
                  style={{ transition: "opacity 0.25s ease" }}
                />

                {/* Node background */}
                <circle
                  r={NODE_RADIUS}
                  fill="var(--warm-cream)"
                  stroke={color}
                  strokeWidth={isFocused ? 2.5 : 1.5}
                  filter="url(#node-shadow)"
                  style={{
                    transition: "all 0.2s ease",
                    transform: isFocused ? "scale(1.08)" : "scale(1)",
                    transformOrigin: "center",
                  }}
                />

                {/* Inner ring */}
                <circle
                  r={NODE_RADIUS - 5}
                  fill="none"
                  stroke={color}
                  strokeWidth="0.5"
                  strokeOpacity="0.2"
                  strokeDasharray="3 3"
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

                {/* Wallet ID label */}
                <text
                  textAnchor="middle"
                  y={14}
                  className="font-mono-data"
                  style={{ fontSize: "8px", fontWeight: 600 }}
                  fill={color}
                >
                  #{node.walletId}
                </text>

                {/* Hover tooltip */}
                {isFocused && node.log && (
                  <g transform={`translate(0, ${-NODE_RADIUS - 16})`}>
                    <rect
                      x={-60}
                      y={-22}
                      width={120}
                      height={22}
                      rx={6}
                      fill="var(--dark-ink)"
                      fillOpacity="0.9"
                    />
                    <text
                      textAnchor="middle"
                      y={-7}
                      fill="white"
                      style={{ fontSize: "9px" }}
                    >
                      {node.log.reason.length > 18
                        ? node.log.reason.slice(0, 18) + "…"
                        : node.log.reason}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

        {/* Center node */}
        {currentNodes.length > 0 && (
          <g transform={`translate(${currentNodes[0].x}, ${currentNodes[0].y})`}>
            {/* Outer glow ring */}
            <circle
              r={CENTER_RADIUS + 20}
              fill={
                score >= 0 ? "url(#glow-forest)" : "url(#glow-terra)"
              }
              opacity="0.6"
            >
              <animate
                attributeName="r"
                values={`${CENTER_RADIUS + 16};${CENTER_RADIUS + 22};${CENTER_RADIUS + 16}`}
                dur="3s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.4;0.7;0.4"
                dur="3s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Score arc — endorsement portion (green) */}
            {totalInteractions > 0 && (
              <>
                <path
                  d={describeArc(0, 0, CENTER_RADIUS + 6, 0, endorseAngle)}
                  fill="none"
                  stroke="var(--forest)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  opacity="0.6"
                />
                {/* Score arc — report portion (red) */}
                <path
                  d={describeArc(
                    0,
                    0,
                    CENTER_RADIUS + 6,
                    endorseAngle,
                    360
                  )}
                  fill="none"
                  stroke="var(--terra)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  opacity="0.6"
                />
              </>
            )}

            {/* Main circle */}
            <circle
              r={CENTER_RADIUS}
              fill="var(--warm-cream)"
              stroke={scoreColor}
              strokeWidth="2.5"
              filter="url(#node-shadow)"
            />

            {/* Inner decorative ring */}
            <circle
              r={CENTER_RADIUS - 8}
              fill="none"
              stroke={scoreColor}
              strokeWidth="0.5"
              strokeOpacity="0.2"
              strokeDasharray="4 4"
            />

            {/* Wallet ID */}
            <text
              textAnchor="middle"
              dominantBaseline="middle"
              y={-12}
              className="font-mono-data"
              style={{ fontSize: "11px", fontWeight: 700 }}
              fill="var(--dark-ink)"
            >
              WALLET #{reputation?.wallet_id || "?"}
            </text>

            {/* Score */}
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
      <div className="absolute bottom-6 left-6 z-10">
        <div className="card-botanical px-5 py-4 space-y-3 backdrop-blur-sm">
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
          <div className="flex items-center gap-4 pt-1 border-t border-[var(--faded-sage)]/50 text-[10px] text-[var(--stone)] font-mono-data">
            <span className="text-[var(--forest)] font-bold">
              +{endorsements.length}
            </span>
            <span className="text-[var(--terra)] font-bold">
              −{reports.length}
            </span>
            <span>= {score}</span>
          </div>
        </div>
      </div>

      {/* ── Stats Panel ── */}
      {reputation && (
        <div className="absolute top-6 right-6 z-10">
          <div className="card-botanical px-5 py-4 space-y-2">
            <div className="flex items-center gap-2 mb-3">
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

            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-[var(--stone)]">
                  Score
                </p>
                <p
                  className="text-lg font-heading font-bold"
                  style={{ color: scoreColor }}
                >
                  {score > 0 ? `+${score}` : score}
                </p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-[var(--stone)]">
                  Status
                </p>
                <p
                  className="text-lg font-heading font-bold"
                  style={{ color: scoreColor }}
                >
                  {scoreLabel}
                </p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-[var(--stone)]">
                  Endorsements
                </p>
                <p className="text-sm font-mono-data font-bold text-[var(--forest)]">
                  {endorseCount}
                </p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-[var(--stone)]">
                  Reports
                </p>
                <p className="text-sm font-mono-data font-bold text-[var(--terra)]">
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
          onClick={() => {
            const newZoom = Math.min(zoom * 1.3, 3);
            const newW = containerSize.width / newZoom;
            const newH = containerSize.height / newZoom;
            setViewBox({
              x: centerX - newW / 2,
              y: centerY - newH / 2,
              w: newW,
              h: newH,
            });
            setZoom(newZoom);
          }}
          className="w-9 h-9 card-botanical flex items-center justify-center text-[var(--dark-ink)] hover:text-[var(--forest)] hover:bg-[var(--forest)]/5 transition-all cursor-pointer text-lg font-bold"
        >
          +
        </button>
        <button
          onClick={() => {
            const newZoom = Math.max(zoom * 0.7, 0.4);
            const newW = containerSize.width / newZoom;
            const newH = containerSize.height / newZoom;
            setViewBox({
              x: centerX - newW / 2,
              y: centerY - newH / 2,
              w: newW,
              h: newH,
            });
            setZoom(newZoom);
          }}
          className="w-9 h-9 card-botanical flex items-center justify-center text-[var(--dark-ink)] hover:text-[var(--forest)] hover:bg-[var(--forest)]/5 transition-all cursor-pointer text-lg font-bold"
        >
          −
        </button>
        <button
          onClick={() => {
            setViewBox({ x: 0, y: 0, w: containerSize.width, h: containerSize.height });
            setZoom(1);
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
          position={selectedNode.position}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}