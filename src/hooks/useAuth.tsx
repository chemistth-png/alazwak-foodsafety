import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let initializing = true;
    let validationRevision = 0;

    const validateSession = async (candidate: Session | null) => {
      const revision = ++validationRevision;
      if (!candidate) {
        if (!active) return;
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      if (active) setLoading(true);

      try {
        // getSession() reads local storage; getUser(jwt) verifies the token with
        // Supabase Auth before protected routes are allowed to render.
        const { data: { user: verifiedUser }, error } = await supabase.auth.getUser(candidate.access_token);
        if (!active || revision !== validationRevision) return;

        if (error || !verifiedUser) {
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        setSession(candidate);
        setUser(verifiedUser);
      } catch {
        if (!active || revision !== validationRevision) return;
        // Fail closed on network or token verification errors.
        setSession(null);
        setUser(null);
      } finally {
        if (active && revision === validationRevision) setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // Ignore startup events until the stored session has been checked below.
      if (initializing) return;

      if (event === "SIGNED_OUT" || !nextSession) {
        validationRevision += 1;
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      // Supabase advises keeping network calls outside the auth callback.
      setTimeout(() => { void validateSession(nextSession); }, 0);
    });

    const initialize = async () => {
      try {
        const { data: { session: storedSession }, error } = await supabase.auth.getSession();
        if (!active) return;
        initializing = false;
        if (error) {
          await validateSession(null);
          return;
        }
        await validateSession(storedSession);
      } catch {
        if (!active) return;
        initializing = false;
        await validateSession(null);
      }
    };

    void initialize();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
