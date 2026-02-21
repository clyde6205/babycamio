import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Subscription {
  id: string;
  plan: "free" | "pro";
  status: string;
  payment_provider: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) setSubscription(data as Subscription);
      setLoading(false);
    };
    fetch();
  }, []);

  const isPro = subscription?.plan === "pro" && subscription?.status === "active";

  return { subscription, loading, isPro };
}
