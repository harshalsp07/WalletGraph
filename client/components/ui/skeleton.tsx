"use client";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
  animate?: boolean;
}

export function Skeleton({ 
  className = "", 
  variant = "rectangular", 
  width, 
  height,
  animate = true 
}: SkeletonProps) {
  const baseClasses = animate 
    ? "animate-pulse bg-gradient-to-r from-[var(--faded-sage)]/40 via-[var(--faded-sage)]/20 to-[var(--faded-sage)]/40 bg-[length:200%_100%]"
    : "bg-[var(--faded-sage)]/40";

  const variantClasses = {
    text: "rounded h-4",
    circular: "rounded-full",
    rectangular: "rounded-lg",
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{
        width: width ? (typeof width === "number" ? `${width}px` : width) : "100%",
        height: height ? (typeof height === "number" ? `${height}px` : height) : "auto",
      }}
    />
  );
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          variant="text" 
          width={i === lines - 1 ? "70%" : "100%"} 
          height={16} 
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`card-botanical p-4 space-y-4 ${className}`}>
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" height={14} />
          <Skeleton variant="text" width="40%" height={12} />
        </div>
      </div>
      <Skeleton height={80} />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton height={32} />
        <Skeleton height={32} />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex gap-2">
        <Skeleton width="20%" height={16} />
        <Skeleton width="30%" height={16} />
        <Skeleton width="25%" height={16} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-2">
          <Skeleton width="20%" height={24} />
          <Skeleton width="30%" height={24} />
          <Skeleton width="25%" height={24} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonProfile({ className = "" }: { className?: string }) {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={80} height={80} />
        <div className="flex-1 space-y-2">
          <Skeleton width="40%" height={24} />
          <Skeleton width="60%" height={16} />
        </div>
      </div>
      <SkeletonText lines={4} />
      <Skeleton height={100} />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton height={60} />
        <Skeleton height={60} />
        <Skeleton height={60} />
      </div>
    </div>
  );
}