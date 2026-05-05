import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BottomNav } from "@/components/BottomNav";

const routerMock = vi.hoisted(() => ({
  pathname: "/app",
  navigate: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: routerMock.pathname }),
  useNavigate: () => routerMock.navigate,
}));

vi.mock("@/lib/icons", () => ({
  FontAwesomeIcon: ({ className }: { className?: string }) => (
    <span aria-hidden="true" className={className} data-testid="nav-icon" />
  ),
  iconHome: {},
  iconOperacao: {},
  iconWrench: {},
  iconHistory: {},
  iconMoreHorizontal: {},
}));

describe("BottomNav", () => {
  beforeEach(() => {
    routerMock.pathname = "/app";
    routerMock.navigate.mockClear();
  });

  it("renders namespaced navigation items", () => {
    render(<BottomNav />);

    expect(screen.getByRole("button", { name: /Início/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Operação/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ferramentas/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Histórico/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mais/i })).toBeInTheDocument();
  });

  it("navigates using the app namespace", () => {
    render(<BottomNav />);

    fireEvent.click(screen.getByRole("button", { name: /Histórico/i }));

    expect(routerMock.navigate).toHaveBeenCalledWith("/app/history");
  });

  it("marks the exact app home route as active", () => {
    render(<BottomNav />);

    expect(screen.getByRole("button", { name: /Início/i })).toHaveClass("text-primary");
    expect(screen.getByRole("button", { name: /Operação/i })).not.toHaveClass("text-primary");
  });

  it("marks nested section routes as active", () => {
    routerMock.pathname = "/app/operation/details";

    render(<BottomNav />);

    expect(screen.getByRole("button", { name: /Operação/i })).toHaveClass("text-primary");
    expect(screen.getByRole("button", { name: /Início/i })).not.toHaveClass("text-primary");
  });

  it("hides navigation during trip creation", () => {
    routerMock.pathname = "/app/new-trip";

    render(<BottomNav />);

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("hides navigation inside trip detail routes", () => {
    routerMock.pathname = "/app/trip/123";

    render(<BottomNav />);

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});
