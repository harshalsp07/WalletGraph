"use client";

import { useId } from "react";

/**
 * WalletGraph wordmark + botanical “ledger graph” icon (shared header / marketing).
 */
export function BrandMarkIcon({
  className,
  size = 40,
}: {
  className?: string;
  size?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const fgId = `brand-fg-${uid}`;
  const leafId = `brand-leaf-${uid}`;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={fgId} x1="8" y1="6" x2="34" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FAF9F6" />
          <stop offset="1" stopColor="#E8E6D9" />
        </linearGradient>
        <linearGradient id={leafId} x1="20" y1="8" x2="14" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6B8F4E" />
          <stop offset="1" stopColor="#4B6E48" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${fgId})`} />
      <path
        d="M20 7c-2.8 3.6-5 7.8-5 12.2 0 4.8 2.6 8.6 5 10.8 2.4-2.2 5-6 5-10.8C25 14.8 22.8 10.6 20 7Z"
        fill={`url(#${leafId})`}
        stroke="#3d5c3b"
        strokeWidth="0.75"
        strokeLinejoin="round"
      />
      <path d="M20 18v11" stroke="#3d5c3b" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="12" cy="26" r="2.2" fill="#4B6E48" stroke="#FAF9F6" strokeWidth="0.6" />
      <circle cx="28" cy="26" r="2.2" fill="#A0522D" stroke="#FAF9F6" strokeWidth="0.6" />
      <circle cx="20" cy="31" r="2.2" fill="#4B6E48" stroke="#FAF9F6" strokeWidth="0.6" />
      <path
        d="M14.2 25.4 18.2 22.6M25.8 25.4 21.8 22.6M20 28.8V24.2"
        stroke="#FAF9F6"
        strokeWidth="0.9"
        strokeLinecap="round"
        opacity="0.95"
      />
    </svg>
  );
}
