"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate } from "animejs";

interface InteractionLog {
  log_id: number;
  target_wallet_id: number;
  is_endorsement: boolean;
  reason: string;
  timestamp: number;
}

interface StickyNoteProps {
  log: InteractionLog;
  type: "endorsement" | "report" | "center";
  /** Viewport coordinates (pixels) where the graph node sits — not SVG user units */
  anchor: { x: number; y: number };
  onClose: () => void;
}

export default function StickyNote({ log, type, anchor, onClose }: StickyNoteProps) {
  const noteRef = useRef<HTMLDivElement>(null);
  const rotation = (log.log_id % 7) - 3;
  const [placed, setPlaced] = useState(false);

  useLayoutEffect(() => {
    const el = noteRef.current;
    if (!el) return;
    const pad = 12;
    const gap = 14;
    const w = el.offsetWidth || 256;
    const h = el.offsetHeight || 200;

    let left = anchor.x + gap;
    let top = anchor.y - h / 2;

    if (left + w > window.innerWidth - pad) {
      left = anchor.x - w - gap;
    }
    if (left < pad) left = pad;
    top = Math.max(pad, Math.min(top, window.innerHeight - h - pad));

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlaced(true);
  }, [anchor.x, anchor.y]);

  useEffect(() => {
    const el = noteRef.current;
    if (!el || !placed) return;
    animate(el, {
      scale: [0.88, 1],
      rotate: [rotation - 4, rotation],
      duration: 380,
      easing: "easeOutBack",
    });
  }, [placed, rotation]);

  const formatDate = (timestamp: number) => {
    if (timestamp === 0) return "Unknown";
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const isEndorsement = type === "endorsement";
  const isCenter = type === "center";
  const bgColor = isCenter ? "#F5FEFE" : isEndorsement ? "#FFFEF5" : "#FEF8F5";
  const borderColor = isCenter ? "var(--sage)" : isEndorsement ? "var(--forest)" : "var(--terra)";
  const accentColor = isCenter ? "var(--sage)" : isEndorsement ? "var(--forest)" : "var(--terra)";

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        style={{ background: "rgba(44, 44, 43, 0.04)" }}
        aria-hidden
      />
      <div
        ref={noteRef}
        className="fixed z-50 w-72 max-w-[calc(100vw-24px)]"
        style={{
          background: bgColor,
          border: `1.5px solid ${borderColor}`,
          transform: `rotate(${rotation}deg)`,
          transformOrigin: "center center",
          boxShadow:
            "0 12px 40px rgba(44, 44, 43, 0.14), 0 4px 12px rgba(44, 44, 43, 0.08), inset 0 1px 0 rgba(255,255,255,0.65)",
          fontFamily: "var(--font-sans)",
          left: -9999,
          top: -9999,
          opacity: placed ? 1 : 0,
          borderRadius: "14px",
        }}
        role="dialog"
        aria-labelledby="sticky-note-title"
      >
        <div
          className="absolute top-0 left-0 right-0 h-1.5 rounded-t-[13px]"
          style={{
            background: `linear-gradient(90deg, ${accentColor}45, ${accentColor}18, ${accentColor}45)`,
          }}
        />

        <button
          type="button"
          onClick={onClose}
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center text-[var(--stone)] hover:text-[var(--dark-ink)] hover:bg-[var(--parchment)] transition-all cursor-pointer"
          style={{ fontSize: "18px", lineHeight: 1 }}
          aria-label="Close"
        >
          &times;
        </button>

        <div className="pt-7 px-4 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: `${accentColor}22` }}
            >
              {isCenter ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              ) : isEndorsement ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 10v12" />
                  <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" y1="22" x2="4" y2="15" />
                </svg>
              )}
            </div>
            <span
              id="sticky-note-title"
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: accentColor }}
            >
              {isCenter ? "Wallet" : isEndorsement ? "Endorsed" : "Reported"}
            </span>
          </div>

          <div
            className="text-[10px] font-mono-data mb-2"
            style={{ color: "var(--stone)" }}
          >
            by Wallet #{log.target_wallet_id}
          </div>

          <div
            className="h-px w-full mb-3"
            style={{ background: `linear-gradient(90deg, transparent, ${accentColor}35, transparent)` }}
          />

          <p
            className="text-sm leading-relaxed mb-3"
            style={{
              color: "var(--dark-ink)",
              fontFamily: "var(--font-sans)",
              fontStyle: "italic",
            }}
          >
            &ldquo;{log.reason}&rdquo;
          </p>

          <div
            className="pt-3 border-t"
            style={{ borderColor: `${accentColor}22` }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] font-mono-data"
                style={{ color: "var(--stone)" }}
              >
                #{log.log_id}
              </span>
              <span
                className="text-[10px] font-mono-data"
                style={{ color: "var(--stone)" }}
              >
                {formatDate(log.timestamp)}
              </span>
            </div>
          </div>
        </div>

        <div
          className="absolute -bottom-1.5 left-5 w-3 h-3"
          style={{
            background: bgColor,
            transform: "rotate(45deg)",
            border: `1.5px solid ${borderColor}`,
            borderTop: "none",
            borderLeft: "none",
          }}
        />
      </div>
    </>
  );
}
