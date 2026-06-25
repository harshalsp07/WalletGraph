import { render, screen } from "@testing-library/react";
import FloatingHeader from "@/components/FloatingHeader";

jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    };
  },
}));

describe("FloatingHeader", () => {
  it("renders the logo and title", () => {
    render(<FloatingHeader />);
    expect(screen.getByText("WalletGraph")).toBeInTheDocument();
  });

  it("renders the subtitle", () => {
    render(<FloatingHeader />);
    expect(screen.getByText("Botanical Ledger")).toBeInTheDocument();
  });
});