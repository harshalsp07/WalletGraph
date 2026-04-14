"use client";

import { cn } from "@/lib/utils";

interface MeteorsProps {
  number?: number;
  className?: string;
}

const generateMeteors = (count: number) => {
  const seeded = Array.from({ length: count }, (_, i) => {
    const seed = (i * 9301 + 49297) % 233280;
    const random = seed / 233280;
    return {
      id: i,
      left: `${Math.floor(random * 100)}%`,
      delay: `${(random * 5).toFixed(1)}s`,
      duration: `${(random * 3 + 2).toFixed(1)}s`,
    };
  });
  return seeded;
};

export function Meteors({ number = 15, className }: MeteorsProps) {
  const meteors = generateMeteors(number);

  return (
    <>
      {meteors.map((m) => (
        <span
          key={m.id}
          className={cn(
            "pointer-events-none absolute top-0 left-1/2 h-0.5 w-0.5 rotate-[215deg] animate-meteor rounded-full bg-white/80 shadow-[0_0_0_1px_#ffffff10]",
            "before:content-[''] before:absolute before:top-1/2 before:right-0 before:h-px before:w-[50px] before:-translate-y-1/2 before:bg-gradient-to-r before:from-[#7c6cf099] before:to-transparent",
            className
          )}
          style={{
            left: m.left,
            animationDelay: m.delay,
            animationDuration: m.duration,
          }}
        />
      ))}
    </>
  );
}
