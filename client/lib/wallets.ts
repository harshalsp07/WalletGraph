import type { WalletProvider } from "@/hooks/contract";

export type WalletOption = {
  id: WalletProvider;
  name: string;
  subtitle: string;
  description: string;
  accent: string;
  installUrl?: string;
};

export const WALLET_OPTIONS: WalletOption[] = [
  {
    id: "freighter",
    name: "Freighter",
    subtitle: "Primary Soroban signer",
    description: "Best support for WalletGraph transactions and contract signing.",
    accent: "var(--forest)",
    installUrl: "https://www.freighter.app/",
  },
  {
    id: "rabet",
    name: "Rabet",
    subtitle: "Extension wallet",
    description: "Alternative browser wallet with extension-based account access.",
    accent: "var(--amber-sap)",
    installUrl: "https://rabet.io/",
  },
  {
    id: "xbull",
    name: "xBull",
    subtitle: "Advanced wallet",
    description: "Modern wallet experience with optional extension signing flow.",
    accent: "var(--moss)",
    installUrl: "https://xbull.app/",
  },
  {
    id: "lobstr",
    name: "LOBSTR",
    subtitle: "Mobile-first ecosystem",
    description: "Planned support for Lobstr-driven auth and wallet linking.",
    accent: "var(--stone)",
    installUrl: "https://lobstr.co/",
  },
];
