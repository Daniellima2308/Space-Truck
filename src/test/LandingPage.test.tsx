import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import LandingPage from "@/pages/LandingPage";

function renderLandingPage() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  );
}

describe("LandingPage", () => {
  it("renders the main public landing sections", () => {
    renderLandingPage();

    expect(screen.getByRole("heading", { name: /Saiba se a viagem deu lucro de verdade/i })).toBeInTheDocument();
    expect(screen.getByText(/No fim da viagem/i)).toBeInTheDocument();
    expect(screen.getByText(/Não é só anotar/i)).toBeInTheDocument();
    expect(screen.getByText(/Bino não entra como enfeite/i)).toBeInTheDocument();
    expect(screen.getByText(/Entre na lista e acompanhe/i)).toBeInTheDocument();
    expect(screen.getByText(/O Space Truck já está disponível/i)).toBeInTheDocument();
  });

  it("links primary CTAs to the early access section", () => {
    renderLandingPage();

    const ctaLinks = screen.getAllByRole("link", { name: /Quero acesso antecipado|Pré-registro|Acesso antecipado/i });
    expect(ctaLinks.some((link) => link.getAttribute("href") === "#pre-registro")).toBe(true);
  });

  it("renders Bino fallback content when an image fails to load", () => {
    renderLandingPage();

    fireEvent.error(screen.getByAltText(/Bino apontando e explicando/i));
    expect(screen.getByText("Bino apontando")).toBeInTheDocument();
  });
});
