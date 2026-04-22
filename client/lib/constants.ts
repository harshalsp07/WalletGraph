export const CATEGORIES = [
  { id: 0, label: "General", icon: "★", color: "#4B6E48", description: "General trust and reliability" },
  { id: 1, label: "Trading", icon: "⇄", color: "#6B8F4E", description: "Peer-to-peer trading" },
  { id: 2, label: "Lending", icon: "💰", color: "#C9A84C", description: "Lending and borrowing" },
  { id: 3, label: "NFTs", icon: "◎", color: "#9B59B6", description: "NFT transactions" },
  { id: 4, label: "Development", icon: "⚙", color: "#3498DB", description: "Technical development" },
  { id: 5, label: "Social", icon: "👥", color: "#E67E22", description: "Social interactions" },
] as const;

export type CategoryId = typeof CATEGORIES[number]["id"];

export function getCategoryInfo(categoryId: number) {
  return CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[0];
}

export const ENDORSEMENT_TEMPLATES = [
  "Honest and reliable trader",
  "Fast delivery, as promised",
  "Great communication",
  "Would trade again anytime",
  "Trusted on multiple deals",
  "Professional conduct",
  "Funds always delivered",
];

export const REPORT_TEMPLATES = [
  "Scam - took payment and vanished",
  "Did not deliver after payment",
  "Rude and unprofessional",
  "Failed to send goods",
  "Misrepresented item condition",
  "Attempted blackmail",
  "Used fake accounts",
];

export const SCORE_LABELS = {
  positive: "Trusted",
  negative: "Flagged",
  neutral: "Neutral",
  newcomer: "Newcomer",
} as const;

export function getScoreLabel(score: number): string {
  if (score > 0) return SCORE_LABELS.positive;
  if (score < 0) return SCORE_LABELS.negative;
  return SCORE_LABELS.neutral;
}

export function getScoreColor(score: number): string {
  if (score > 0) return "var(--forest)";
  if (score < 0) return "var(--terra)";
  return "var(--amber-sap)";
}

export const MAX_REASON_LENGTH = 280;
export const MIN_REASON_LENGTH = 3;