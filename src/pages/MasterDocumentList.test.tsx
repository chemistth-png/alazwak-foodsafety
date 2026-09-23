import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MasterDocumentList from "./MasterDocumentList";
const db = vi.hoisted(() => ({ from: vi.fn(), order: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: db }));
vi.mock("@/components/ThemeToggle", () => ({ default: () => null }));
vi.mock("@/components/DocumentHeader", () => ({ default: () => null }));
afterEach(cleanup);
it("does not infer approval from length and preserves identity after filtering", async () => {
  db.from.mockReturnValue({ select: () => ({ order: db.order }) });
  db.order.mockResolvedValue({ error: null, data: [
    { id: "uuid-a", file_name: "First.txt", content: "x".repeat(6000), created_at: "2026-09-22" },
    { id: "uuid-b", file_name: "Second.txt", content: "short", created_at: "2026-09-22" },
  ] });
  render(<MemoryRouter><MasterDocumentList /></MemoryRouter>);
  expect(await screen.findByText("DOC-uuid-a")).toBeInTheDocument();
  expect(screen.getAllByText("اعتماد غير متحقق")).toHaveLength(2);
  expect(screen.queryByText("معتمدة", { exact: true })).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "First" } });
  expect(screen.getByText("DOC-uuid-a")).toBeInTheDocument();
  expect(screen.queryByText("Second.txt")).not.toBeInTheDocument();
});
