"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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

interface NodePosition {
  x: number;
  y: number;
}

interface GraphNode {
  id: string;
  walletId: number;
  type: "center" | "endorsement" | "report";
  log?: InteractionLog;
}

const MAX_NODES = 20;
const CENTER_RADIUS = 180;
const NODE_RADIUS = 50;
const CENTER_SIZE = 80;

function generateInkPath(x1: number, y1: number, x2: number, y2: number, seed: number): string {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const perpX = -dy / len;
  const perpY = dx / len;
  
  const wobble = (seed % 7) - 3;
  const cp1x = midX + perpX * wobble * 2 + (seed % 5 - 2) * 3;
  const cp1y = midY + perpY * wobble * 2 + (seed % 4 - 2) * 3;
  const cp2x = midX - perpX * wobble * 1.5 + ((seed * 3) % 5 - 2) * 2;
  const cp2y = midY - perpY * wobble * 1.5 + ((seed * 2) % 4 - 2) * 2;

  return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
}

function calculateNodePosition(
  index: number,
  total: number,
  isEndorsement: boolean,
  centerX: number,
  centerY: number
): NodePosition {
  const angleStart = isEndorsement ? -150 : 30;
  const angleEnd = isEndorsement ? -30 : 150;
  const angleRange = angleEnd - angleStart;
  const angle = angleStart + (angleRange / (total + 1)) * (index + 1);
  
  const radians = (angle * Math.PI) / 180;
  return {
    x: centerX + Math.cos(radians) * CENTER_RADIUS,
    y: centerY + Math.sin(radians) * CENTER_RADIUS,
  };
}

export default function GraphVisualization({
  reputation,
  walletHistory,
}: {
  reputation: ReputationRecord | null;
  walletHistory: InteractionLog[];
  walletAddress?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [visibleCount, setVisibleCount] = useState(MAX_NODES);
  const [selectedNode, setSelectedNode] = useState<{ node: GraphNode; position: NodePosition } | null>(null);
  const [animatedPaths, setAnimatedPaths] = useState<Set<string>>(new Set());
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const centerX = containerSize.width / 2;
  const centerY = containerSize.height / 2;

  const endorsements = walletHistory.filter((log) => log.is_endorsement);
  const reports = walletHistory.filter((log) => !log.is_endorsement);

  const displayEndorsements = endorsements.slice(0, Math.min(10, Math.floor(visibleCount / 2)));
  const displayReports = reports.slice(0, Math.min(10, Math.floor(visibleCount / 2)));

  useEffect(() => {
    const paths = document.querySelectorAll(".ink-line");
    paths.forEach((path) => {
      const pathEl = path as SVGPathElement;
      const length = pathEl.getTotalLength();
      pathEl.style.strokeDasharray = `${length}`;
      pathEl.style.strokeDashoffset = `${length}`;
    });

    const newAnimated = new Set<string>();
    displayEndorsements.forEach((log, index) => {
      const delay = 200 + index * 80;
      setTimeout(() => {
        const path = document.querySelector(`[data-path="end-${log.log_id}"]`) as SVGPathElement;
        if (path) {
          animate(path, {
            strokeDashoffset: [path.style.strokeDasharray, 0],
            duration: 800,
            easing: "easeOutQuad",
          });
          newAnimated.add(`end-${log.log_id}`);
          setAnimatedPaths(new Set(newAnimated));
        }
      }, delay);
    });

    displayReports.forEach((log, index) => {
      const delay = 200 + (displayEndorsements.length + index) * 80;
      setTimeout(() => {
        const path = document.querySelector(`[data-path="report-${log.log_id}"]`) as SVGPathElement;
        if (path) {
          animate(path, {
            strokeDashoffset: [path.style.strokeDasharray, 0],
            duration: 800,
            easing: "easeOutQuad",
          });
          newAnimated.add(`report-${log.log_id}`);
          setAnimatedPaths(new Set(newAnimated));
        }
      }, delay);
    });
  }, [containerSize, visibleCount, displayEndorsements, displayReports]);

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      if (node.type === "center") return;

      let position: NodePosition;
      if (node.type === "endorsement") {
        const idx = displayEndorsements.findIndex((e) => e.log_id === node.log?.log_id);
        position = calculateNodePosition(idx, displayEndorsements.length, true, centerX, centerY);
      } else {
        const idx = displayReports.findIndex((r) => r.log_id === node.log?.log_id);
        position = calculateNodePosition(idx, displayReports.length, false, centerX, centerY);
      }

      setSelectedNode({ node, position });
    },
    [displayEndorsements, displayReports, centerX, centerY]
  );

  const scoreColor =
    (reputation?.score || 0) > 0
      ? "var(--forest)"
      : (reputation?.score || 0) < 0
      ? "var(--terra)"
      : "var(--amber-sap)";

  const hasMore =
    endorsements.length > displayEndorsements.length ||
    reports.length > displayReports.length;

  return (
    <div ref={containerRef} className="w-full h-screen relative">
      <svg className="w-full h-full" style={{ overflow: "visible" }}>
        <defs>
          <filter id="ink-texture" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G" />
          </filter>

          <linearGradient id="centerGradientPositive" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--forest)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--moss)" stopOpacity="0.1" />
          </linearGradient>

          <linearGradient id="centerGradientNegative" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--terra)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--amber-sap)" stopOpacity="0.1" />
          </linearGradient>

          <radialGradient id="nodeGlowGreen" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--forest)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--forest)" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="nodeGlowTerra" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--terra)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--terra)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {displayEndorsements.map((log, index) => {
          const pos = calculateNodePosition(index, displayEndorsements.length, true, centerX, centerY);
          const seed = log.log_id * 7;
          const pathD = generateInkPath(centerX, centerY, pos.x, pos.y, seed);
          const pathLength = 200;

          return (
            <g key={`line-end-${log.log_id}`}>
              <path
                d={pathD}
                fill="none"
                stroke="var(--forest)"
                strokeWidth="2"
                strokeOpacity="0.4"
                data-path={`end-${log.log_id}`}
                className="ink-line"
                style={{
                  strokeDasharray: pathLength,
                  strokeDashoffset: animatedPaths.has(`end-${log.log_id}`) ? 0 : pathLength,
                }}
              />
            </g>
          );
        })}

        {displayReports.map((log, index) => {
          const pos = calculateNodePosition(index, displayReports.length, false, centerX, centerY);
          const seed = log.log_id * 11;
          const pathD = generateInkPath(centerX, centerY, pos.x, pos.y, seed);
          const pathLength = 200;

          return (
            <g key={`line-report-${log.log_id}`}>
              <path
                d={pathD}
                fill="none"
                stroke="var(--terra)"
                strokeWidth="2"
                strokeOpacity="0.4"
                data-path={`report-${log.log_id}`}
                className="ink-line"
                style={{
                  strokeDasharray: pathLength,
                  strokeDashoffset: animatedPaths.has(`report-${log.log_id}`) ? 0 : pathLength,
                }}
              />
            </g>
          );
        })}

        {displayEndorsements.map((log, index) => {
          const pos = calculateNodePosition(index, displayEndorsements.length, true, centerX, centerY);
          const isHovered = hoveredNode === `end-${log.log_id}`;
          const isSelected = selectedNode?.node.id === `end-${log.log_id}`;

          return (
            <g
              key={`node-end-${log.log_id}`}
              className="cursor-pointer"
              onClick={() => handleNodeClick({ id: `end-${log.log_id}`, walletId: log.target_wallet_id, type: "endorsement", log })}
              onMouseEnter={() => setHoveredNode(`end-${log.log_id}`)}
              onMouseLeave={() => setHoveredNode(null)}
              transform={`translate(${pos.x}, ${pos.y})`}
            >
              <circle
                r={isHovered || isSelected ? NODE_RADIUS + 4 : NODE_RADIUS}
                fill="url(#nodeGlowGreen)"
                style={{ transition: "r 0.2s ease" }}
              />
              <circle
                r={NODE_RADIUS}
                fill="var(--warm-cream)"
                stroke="var(--forest)"
                strokeWidth="2"
                filter={isHovered || isSelected ? "url(#ink-texture)" : "none"}
                style={{
                  transition: "all 0.2s ease",
                  transform: isHovered || isSelected ? "scale(1.05)" : "scale(1)",
                }}
              />
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                className="font-mono-data text-[10px] font-semibold"
                fill="var(--forest)"
              >
                #{log.target_wallet_id}
              </text>
            </g>
          );
        })}

        {displayReports.map((log, index) => {
          const pos = calculateNodePosition(index, displayReports.length, false, centerX, centerY);
          const isHovered = hoveredNode === `report-${log.log_id}`;
          const isSelected = selectedNode?.node.id === `report-${log.log_id}`;

          return (
            <g
              key={`node-report-${log.log_id}`}
              className="cursor-pointer"
              onClick={() => handleNodeClick({ id: `report-${log.log_id}`, walletId: log.target_wallet_id, type: "report", log })}
              onMouseEnter={() => setHoveredNode(`report-${log.log_id}`)}
              onMouseLeave={() => setHoveredNode(null)}
              transform={`translate(${pos.x}, ${pos.y})`}
            >
              <circle
                r={isHovered || isSelected ? NODE_RADIUS + 4 : NODE_RADIUS}
                fill="url(#nodeGlowTerra)"
                style={{ transition: "r 0.2s ease" }}
              />
              <circle
                r={NODE_RADIUS}
                fill="var(--warm-cream)"
                stroke="var(--terra)"
                strokeWidth="2"
                filter={isHovered || isSelected ? "url(#ink-texture)" : "none"}
                style={{
                  transition: "all 0.2s ease",
                  transform: isHovered || isSelected ? "scale(1.05)" : "scale(1)",
                }}
              />
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                className="font-mono-data text-[10px] font-semibold"
                fill="var(--terra)"
              >
                #{log.target_wallet_id}
              </text>
            </g>
          );
        })}

        <g transform={`translate(${centerX}, ${centerY})`}>
          <circle
            r={CENTER_SIZE + 15}
            fill={reputation && reputation.score > 0 ? "url(#nodeGlowGreen)" : "url(#nodeGlowTerra)"}
            className="animate-pulse"
          />
          <circle
            r={CENTER_SIZE}
            fill="var(--warm-cream)"
            stroke={scoreColor}
            strokeWidth="3"
            filter="url(#ink-texture)"
          />
          <circle
            r={CENTER_SIZE - 5}
            fill={reputation && reputation.score > 0 ? "url(#centerGradientPositive)" : "url(#centerGradientNegative)"}
          />
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            className="font-mono-data text-sm font-bold"
            fill="var(--dark-ink)"
          >
            #{reputation?.wallet_id || "?"}
          </text>
        </g>

        <g transform={`translate(${centerX}, ${centerY + CENTER_SIZE + 25})`}>
          <text textAnchor="middle" className="text-2xl font-heading font-bold" fill={scoreColor}>
            {reputation?.score || 0}
          </text>
          <text textAnchor="middle" y="18" className="text-[10px] font-mono-data" fill="var(--stone)">
            {reputation?.score && reputation.score > 0 ? "Trusted" : reputation?.score && reputation.score < 0 ? "Flagged" : "Neutral"}
          </text>
        </g>
      </svg>

      <div className="absolute top-6 left-6">
        <div className="card-botanical px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[var(--forest)]" />
            <span className="text-xs text-[var(--dark-ink)]">{displayEndorsements.length} Endorsements</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[var(--terra)]" />
            <span className="text-xs text-[var(--dark-ink)]">{displayReports.length} Reports</span>
          </div>
        </div>
      </div>

      {reputation && (
        <div className="absolute top-6 right-6">
          <div className="card-botanical px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <span className={`h-2 w-2 rounded-full ${reputation.is_active ? "bg-[var(--forest)]" : "bg-[var(--terra)]"}`} />
              <span className="text-xs text-[var(--stone)]">{reputation.is_active ? "Active" : "Inactive"}</span>
            </div>
            <p className="text-[10px] text-[var(--stone)] font-mono-data">
              Ledger #{reputation.last_updated}
            </p>
          </div>
        </div>
      )}

      {hasMore && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
          <button
            onClick={() => setVisibleCount(MAX_NODES)}
            className="btn-forest cursor-pointer"
          >
            Show All ({endorsements.length + reports.length})
          </button>
        </div>
      )}

      {walletHistory.length === 0 && reputation && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="card-botanical px-6 py-4 text-center opacity-80">
            <p className="text-sm text-[var(--stone)]">No interactions recorded yet</p>
          </div>
        </div>
      )}

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