import { render, screen } from "@testing-library/react";
import FloatingHeader from "@/components/FloatingHeader";

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