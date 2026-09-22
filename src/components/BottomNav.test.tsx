import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BottomNav from "./BottomNav";
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ signOut: vi.fn() }) }));
afterEach(cleanup);

it.each(["/auth", "/landing", "/install", "/reset-password", "/sop"])("hides internal navigation on %s", (path) => {
  render(<MemoryRouter initialEntries={[path]}><BottomNav /></MemoryRouter>);
  expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
});

it("retains the application menu and exposes FSMS and QMS on mobile", () => {
  render(<MemoryRouter initialEntries={["/documents"]}><BottomNav /></MemoryRouter>);
  expect(screen.getByRole("navigation")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "المزيد" }));
  expect(screen.getByRole("button", { name: "إجراءات FSMS" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "نماذج نظام الجودة" })).toBeInTheDocument();
});
