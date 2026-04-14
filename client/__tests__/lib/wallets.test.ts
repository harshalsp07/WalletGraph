import { getWalletOption, WALLET_OPTIONS } from "@/lib/wallets";

describe("wallets", () => {
  describe("getWalletOption", () => {
    it("returns wallet option for valid provider", () => {
      const result = getWalletOption("freighter");
      expect(result).toBeDefined();
      expect(result?.name).toBe("Freighter");
    });

    it("returns null for null provider", () => {
      const result = getWalletOption(null);
      expect(result).toBeNull();
    });

    it("returns null for undefined provider", () => {
      const result = getWalletOption(undefined);
      expect(result).toBeNull();
    });

    it("returns null for unknown provider", () => {
      const result = getWalletOption("unknown");
      expect(result).toBeNull();
    });
  });

  describe("WALLET_OPTIONS", () => {
    it("has at least one recommended wallet", () => {
      const recommended = WALLET_OPTIONS.filter(
        (w) => w.supportLabel === "Recommended"
      );
      expect(recommended.length).toBeGreaterThan(0);
    });

    it("has freighter as recommended", () => {
      const freighter = WALLET_OPTIONS.find((w) => w.id === "freighter");
      expect(freighter?.supportLabel).toBe("Recommended");
    });

    it("has expected wallet count", () => {
      expect(WALLET_OPTIONS.length).toBe(4);
    });
  });
});