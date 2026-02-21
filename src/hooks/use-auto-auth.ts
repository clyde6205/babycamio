import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

/**
 * Auto-authenticates the user. If no session exists, signs in anonymously.
 * Returns the user once authenticated (never null after loading).
 */
export function useAutoAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // Check existing session
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        if (mounted) { setUser(session.user); setLoading(false); }
        return;
      }

      // No session — sign in anonymously
      const { data, error } = await supabase.auth.signInAnonymously();
      if (!error && data.user && mounted) {
        setUser(data.user);
      }
      if (mounted) setLoading(false);
    };

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null);
    });

    init();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
