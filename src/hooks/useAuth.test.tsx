import { act, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./useAuth";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

type AuthChangeCallback = (event: AuthChangeEvent, session: Session | null) => void;

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: authMocks },
}));

const ProtectedContent = () => {
  const { user, loading } = useAuth();
  if (loading) return <p>Checking session</p>;
  return user ? <p>Protected content</p> : <p>Sign in</p>;
};

const storedSession = { access_token: "stored-access-token" } as Session;

beforeEach(() => {
  vi.clearAllMocks();
  authMocks.getSession.mockResolvedValue({ data: { session: storedSession }, error: null });
  authMocks.getUser.mockResolvedValue({ data: { user: { id: "verified-user" } as User }, error: null });
  authMocks.onAuthStateChange.mockImplementation((callback: AuthChangeCallback) => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  }));
});

it("does not expose protected content while the stored session is being verified", async () => {
  let resolveVerification!: (result: { data: { user: User }; error: null }) => void;
  authMocks.getUser.mockReturnValue(new Promise((resolve) => { resolveVerification = resolve; }));

  render(<AuthProvider><ProtectedContent /></AuthProvider>);

  expect(screen.getByText("Checking session")).toBeInTheDocument();
  expect(screen.queryByText("Protected content")).not.toBeInTheDocument();

  await act(async () => {
    resolveVerification({ data: { user: { id: "verified-user" } as User }, error: null });
  });

  expect(await screen.findByText("Protected content")).toBeInTheDocument();
  expect(authMocks.getUser).toHaveBeenCalledWith(storedSession.access_token);
});

it("rejects a stored session the Supabase Auth server cannot verify", async () => {
  authMocks.getUser.mockResolvedValue({ data: { user: null }, error: { status: 401 } });

  render(<AuthProvider><ProtectedContent /></AuthProvider>);

  expect(await screen.findByText("Sign in")).toBeInTheDocument();
  expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  expect(authMocks.getUser).toHaveBeenCalledWith(storedSession.access_token);
});
