import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import ResetPassword from "./ResetPassword";

const auth = vi.hoisted(() => ({ getSession: vi.fn(), onAuthStateChange: vi.fn(), unsubscribe: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth } }));
let listener: (event: AuthChangeEvent, session: Session | null) => void;
const session = { user: { id: "test-user" } } as Session;
const mount = () => render(<MemoryRouter><ResetPassword /></MemoryRouter>);

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  auth.onAuthStateChange.mockImplementation((cb) => {
    listener = cb;
    return { data: { subscription: { unsubscribe: auth.unsubscribe } } };
  });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

it("shows an error instead of spinning when session lookup rejects", async () => {
  auth.getSession.mockRejectedValue(new Error("offline"));
  mount();
  await act(async () => {});
  expect(screen.getByText("تعذر التحقق من الجلسة")).toBeInTheDocument();
  expect(screen.queryByLabelText("كلمة المرور الجديدة")).not.toBeInTheDocument();
});

it("times out a stalled lookup and accepts a later authenticated recovery event", async () => {
  auth.getSession.mockReturnValue(new Promise(() => {}));
  mount();
  await act(async () => { vi.advanceTimersByTime(10000); });
  expect(screen.getByText("تعذر التحقق من الجلسة")).toBeInTheDocument();
  act(() => listener("PASSWORD_RECOVERY", session));
  expect(screen.getByLabelText("كلمة المرور الجديدة")).toBeInTheDocument();
});

it("does not let a stale null lookup override a recovery event", async () => {
  let resolve!: (value: unknown) => void;
  auth.getSession.mockReturnValue(new Promise((r) => { resolve = r; }));
  mount();
  act(() => listener("PASSWORD_RECOVERY", session));
  await act(async () => { resolve({ data: { session: null }, error: null }); });
  await act(async () => { vi.advanceTimersByTime(11000); });
  expect(screen.getByLabelText("كلمة المرور الجديدة")).toBeInTheDocument();
  expect(auth.getSession).toHaveBeenCalledTimes(1);
});

it("revokes the form on sign-out and ignores older session results", async () => {
  let resolve!: (value: unknown) => void;
  auth.getSession.mockReturnValue(new Promise((r) => { resolve = r; }));
  mount();
  act(() => listener("SIGNED_OUT", null));
  await act(async () => { resolve({ data: { session }, error: null }); });
  expect(screen.getByText("رابط غير صالح")).toBeInTheDocument();
});

it("cancels the retry and subscription on unmount", async () => {
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  const view = mount();
  await act(async () => {});
  view.unmount();
  await act(async () => { vi.advanceTimersByTime(11000); });
  expect(auth.getSession).toHaveBeenCalledTimes(1);
  expect(auth.unsubscribe).toHaveBeenCalledOnce();
});

it("rejects a missing session after the bounded retry", async () => {
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mount();
  await act(async () => {});
  await act(async () => { vi.advanceTimersByTime(1500); });
  expect(screen.getByText("رابط غير صالح")).toBeInTheDocument();
  expect(auth.getSession).toHaveBeenCalledTimes(2);
});
