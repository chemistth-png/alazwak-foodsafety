import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Index from "./Index";
import type { streamChat as StreamChat } from "@/lib/chat";

const mocks = vi.hoisted(() => ({ from: vi.fn(), streamChat: vi.fn(), error: vi.fn(), insert: vi.fn(), order: vi.fn(), conversationSelect: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from, auth: { getSession: async () => ({ data: { session: { access_token: "test" } } }) } } }));
vi.mock("@/lib/chat", () => ({ streamChat: mocks.streamChat }));
vi.mock("sonner", () => ({ toast: { error: mocks.error } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "user-a" } }) }));
vi.mock("@/lib/auditLog", () => ({ logAudit: vi.fn() }));
vi.mock("@/components/ThemeToggle", () => ({ default: () => null }));
vi.mock("@/components/ModelSelector", () => ({ default: () => null }));
vi.mock("@/components/VoiceInput", () => ({ default: () => null }));
vi.mock("@/components/ImageGenerator", () => ({ default: () => null }));
vi.mock("@/components/FileUpload", () => ({ default: () => null, AttachedFileChip: () => null }));
vi.mock("@/components/SourcesBadge", () => ({ default: ({ sources }: { sources: { file_name: string }[] }) => <aside>{sources.map(s => s.file_name).join(",")}</aside> }));
vi.mock("@/components/ChatSidebar", () => ({ default: ({ onSelect, onNew }: { onSelect: (id: string) => void; onNew: () => void }) => <div>
  <button onClick={() => onSelect("other")}>Load other</button>
  <button onClick={onNew}>New chat</button>
</div> }));

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
  mocks.order.mockResolvedValue({ data: [{ role: "assistant", content: "Other conversation" }], error: null });
  mocks.insert.mockResolvedValue({ data: { id: "message-1" }, error: null });
  mocks.conversationSelect.mockReturnValue({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }), maybeSingle: async () => ({ data: null, error: null }) }) });
  mocks.from.mockImplementation((table) => table === "conversations" ? {
    insert: () => ({ select: () => ({ single: async () => ({ data: { id: "created" }, error: null }) }) }),
    select: mocks.conversationSelect,
    update: () => ({ eq: async () => ({ error: null }) }),
  } : table === "messages" ? {
    insert: () => ({ select: () => ({ single: mocks.insert }) }),
    select: () => ({ eq: () => ({ order: mocks.order }) }),
  } : {
    insert: mocks.insert,
    select: () => ({ eq: () => ({ order: mocks.order }) }),
  });
});
afterEach(cleanup);
const mount = () => render(<StrictMode><Index /></StrictMode>);
const send = () => {
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Question" } });
  fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
};

it("associates sources with the answer in StrictMode, then clears them on conversation switch", async () => {
  mocks.streamChat.mockImplementation(async (options: Parameters<typeof StreamChat>[0]) => {
    options.onSources?.([{ file_name: "old-source.pdf", relevance: 1 }]);
    options.onDelta("First answer");
    options.onDone();
  });
  mount();
  await waitFor(() => expect(screen.getByRole("textbox")).toBeEnabled());
  send();
  expect(await screen.findByText("old-source.pdf")).toBeInTheDocument();
  fireEvent.click(screen.getAllByText("Load other")[0]);
  expect(await screen.findByText("Other conversation")).toBeInTheDocument();
  expect(screen.queryByText("old-source.pdf")).not.toBeInTheDocument();
});

it("ignores late stream content and sources after starting a new chat", async () => {
  let options!: Parameters<typeof StreamChat>[0];
  let resolve!: () => void;
  mocks.streamChat.mockImplementation((value) => { options = value; return new Promise<void>(r => { resolve = r; }); });
  mount();
  await waitFor(() => expect(screen.getByRole("textbox")).toBeEnabled());
  send();
  await waitFor(() => expect(mocks.streamChat).toHaveBeenCalledOnce());
  fireEvent.click(screen.getAllByText("New chat")[0]);
  await act(async () => {
    options.onDelta("Late answer");
    options.onSources?.([{ file_name: "late-source.pdf", relevance: 1 }]);
    resolve();
  });
  expect(screen.queryByText("Late answer")).not.toBeInTheDocument();
  expect(screen.queryByText("late-source.pdf")).not.toBeInTheDocument();
  expect(screen.getByRole("textbox")).toBeEnabled();
  expect(mocks.insert).toHaveBeenCalledTimes(1); // Only the original user message.
});

it("does not restore an old conversation when its load completes after New chat", async () => {
  let resolve!: (value: unknown) => void;
  mocks.order.mockReturnValue(new Promise(r => { resolve = r; }));
  mount();
  await waitFor(() => expect(screen.getByRole("textbox")).toBeEnabled());
  fireEvent.click(screen.getAllByText("Load other")[0]);
  fireEvent.click(screen.getAllByText("New chat")[0]);
  await act(async () => { resolve({ data: [{ role: "assistant", content: "Stale loaded answer" }], error: null }); });
  expect(screen.queryByText("Stale loaded answer")).not.toBeInTheDocument();
  expect(screen.getByRole("textbox")).toBeEnabled();
});

it("reports persistence failures and releases the composer", async () => {
  mocks.insert.mockResolvedValue({ data: null, error: { message: "write denied" } });
  mount();
  await waitFor(() => expect(screen.getByRole("textbox")).toBeEnabled());
  send();
  await waitFor(() => expect(mocks.error).toHaveBeenCalledOnce());
  expect(screen.getByRole("textbox")).toBeEnabled();
  expect(mocks.streamChat).not.toHaveBeenCalled();
});
