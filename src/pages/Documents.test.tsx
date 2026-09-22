import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Documents from "./Documents";

const db = vi.hoisted(() => ({ from: vi.fn(), order: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: db }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "user-a" } }) }));
vi.mock("@/components/ThemeToggle", () => ({ default: () => null }));
const mount = () => render(<MemoryRouter><Documents /></MemoryRouter>);
beforeEach(() => {
  vi.clearAllMocks();
  db.from.mockReturnValue({ select: () => ({ order: db.order }) });
});
afterEach(cleanup);

it("distinguishes a query failure from an empty library and supports retry", async () => {
  db.order.mockResolvedValueOnce({ data: null, error: { message: "denied" } })
    .mockResolvedValueOnce({ data: [{ id: "1", file_name: "Procedure.txt", content: "Approved procedure", file_size: 10, created_at: "2026-09-22" }], error: null });
  mount();
  expect(await screen.findByRole("alert")).toHaveTextContent("تعذر تحميل المستندات");
  expect(screen.queryByText(/لا توجد مستندات محفوظة/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "إعادة المحاولة" }));
  expect(await screen.findByText("Procedure.txt")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("handles rejected network requests without remaining in loading state", async () => {
  db.order.mockRejectedValue(new Error("offline"));
  mount();
  expect(await screen.findByRole("button", { name: "إعادة المحاولة" })).toBeEnabled();
});
