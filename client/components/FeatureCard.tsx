"use client";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: number;
  onClick?: () => void;
}

export default function FeatureCard({ icon, title, description, delay = 0, onClick }: FeatureCardProps) {
  return (
    <div
      onClick={onClick}
      className={`card-botanical p-6 paper-shadow group cursor-pointer transition-all duration-300 hover:border-[var(--sage)] ${
        onClick ? "hover:scale-[1.02]" : ""
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--forest)]/10 border border-[var(--forest)]/20 mb-4 group-hover:bg-[var(--forest)]/15 group-hover:scale-110 transition-all duration-300">
        <div className="text-[var(--forest)]">{icon}</div>
      </div>
      <h3 className="text-lg font-heading font-bold text-[var(--dark-ink)] mb-2 group-hover:text-[var(--forest)] transition-colors">
        {title}
      </h3>
      <p className="text-sm text-[var(--stone)] leading-relaxed">
        {description}
      </p>
    </div>
  );
}