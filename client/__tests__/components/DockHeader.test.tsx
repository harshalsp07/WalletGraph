import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DockHeader from "@/components/DockHeader";

describe("DockHeader", () => {
  it("renders navigation items", () => {
    render(
      <MemoryRouter>
        <DockHeader
          walletAddress={null}
          walletProvider={null}
          onConnect={() => {}}
          onDisconnect={() => {}}
          isConnecting={false}
        />
      </MemoryRouter>
    );
    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("shows connect button when wallet not connected", () => {
    render(
      <MemoryRouter>
        <DockHeader
          walletAddress={null}
          walletProvider={null}
          onConnect={() => {}}
          onDisconnect={() => {}}
          isConnecting={false}
        />
      </MemoryRouter>
    );
    expect(screen.getByText("Connect")).toBeInTheDocument();
  });

  it("shows wallet address when connected", () => {
    render(
      <MemoryRouter>
        <DockHeader
          walletAddress="GABC123456789"
          walletProvider={null}
          onConnect={() => {}}
          onDisconnect={() => {}}
          isConnecting={false}
        />
      </MemoryRouter>
    );
    expect(screen.getByText("GA")).toBeInTheDocument();
  });
});