import type { WalletProvider } from "@/hooks/contract";

export type WalletCapability = "full" | "limited" | "coming_soon";

export type WalletOption = {
  id: WalletProvider;
  name: string;
  subtitle: string;
  description: string;
  accent: string;
  accentSoft: string;
  gradient: string;
  capability: WalletCapability;
  supportLabel: string;
  helperText: string;
  signSupportLabel: string;
  icon: string;
  installUrl?: string;
};

export const WALLET_OPTIONS: WalletOption[] = [
  {
    id: "freighter",
    name: "Freighter",
    subtitle: "Primary Soroban signer",
    description: "Best support for WalletGraph transactions and contract signing.",
    capability: "full",
    supportLabel: "Recommended",
    helperText: "Best end-to-end experience for login, registration, and on-chain actions.",
    signSupportLabel: "Full signing support",
    icon: "FT",
    accent: "var(--forest)",
    accentSoft: "rgba(75, 110, 72, 0.12)",
    gradient: "linear-gradient(135deg, rgba(75,110,72,0.22), rgba(107,143,78,0.08))",
    installUrl: "https://www.freighter.app/",
  },
  {
    id: "rabet",
    name: "Rabet",
    subtitle: "Extension wallet",
    description: "Alternative browser wallet with extension-based account access.",
    capability: "limited",
    supportLabel: "Works for auth",
    helperText: "Login flow is supported. Contract-signing availability depends on the extension API exposed in your browser.",
    signSupportLabel: "Conditional signing",
    icon: "RB",
    accent: "var(--amber-sap)",
    accentSoft: "rgba(201, 168, 76, 0.14)",
    gradient: "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(160,82,45,0.08))",
    installUrl: "https://rabet.io/",
  },
  {
    id: "xbull",
    name: "xBull",
    subtitle: "Advanced wallet",
    description: "Modern wallet experience with optional extension signing flow.",
    capability: "limited",
    supportLabel: "Works for auth",
    helperText: "Connection is supported today, and signing works when the installed xBull extension exposes transaction signing.",
    signSupportLabel: "Extension-dependent signing",
    icon: "XB",
    accent: "var(--moss)",
    accentSoft: "rgba(107, 143, 78, 0.14)",
    gradient: "linear-gradient(135deg, rgba(107,143,78,0.2), rgba(178,172,136,0.08))",
    installUrl: "https://xbull.app/",
  },
  {
    id: "lobstr",
    name: "LOBSTR",
    subtitle: "Mobile-first ecosystem",
    description: "Planned support for Lobstr-driven auth and wallet linking.",
    capability: "coming_soon",
    supportLabel: "Coming soon",
    helperText: "We expose the route now so the product can grow into mobile-first wallet linking without redesigning the login flow later.",
    signSupportLabel: "Not yet supported",
    icon: "LB",
    accent: "var(--stone)",
    accentSoft: "rgba(137, 137, 137, 0.12)",
    gradient: "linear-gradient(135deg, rgba(137,137,137,0.18), rgba(212,208,188,0.08))",
    installUrl: "https://lobstr.co/",
  },
];

export function getWalletOption(provider: WalletProvider | null | undefined) {
  return WALLET_OPTIONS.find((wallet) => wallet.id === provider) ?? null;
}
