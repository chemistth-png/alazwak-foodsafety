import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import FileUpload from "./FileUpload";
const mocks = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), upload: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: "user-a" } } }),
    getSession: async () => ({ data: { session: { access_token: "test-session" } } }) },
  storage: { from: () => ({ upload: mocks.upload }) },
} }));
beforeEach(() => { vi.clearAllMocks(); mocks.upload.mockResolvedValue({ error: null }); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it.each([false, true])("requires explicit saved confirmation (%s)", async saved => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () =>
    saved ? { text: "content", saved: true, documentId: "doc-1" } : { text: "content" } }));
  const processed = vi.fn(); render(<FileUpload onFileProcessed={processed} />);
  fireEvent.change(screen.getByLabelText("إرفاق مستند نصي"), { target: { files: [new File(["content"], "test.txt", { type: "text/plain" })] } });
  await waitFor(() => expect(saved ? mocks.success : mocks.error).toHaveBeenCalled());
  if (saved) expect(processed).toHaveBeenCalledWith("test.txt", "content");
  else { expect(processed).not.toHaveBeenCalled(); expect(mocks.success).not.toHaveBeenCalled(); }
});
