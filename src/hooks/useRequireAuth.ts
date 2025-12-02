import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface AuthState {
  loading: boolean;
  userId: string | null;
  householdId: string | null;
}

export const useRequireAuth = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<AuthState>({
    loading: true,
    userId: null,
    householdId: null,
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("current_household_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!profile?.current_household_id) {
        navigate("/velg-husstand");
        return;
      }

      setState({
        loading: false,
        userId: session.user.id,
        householdId: profile.current_household_id,
      });
    };

    checkAuth();
  }, [navigate]);

  return state;
};
