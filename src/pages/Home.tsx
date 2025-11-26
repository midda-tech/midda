import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { toast } from "sonner";

const Home = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndHousehold = async () => {
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

      setLoading(false);
    };

    checkAuthAndHousehold();
  }, [navigate]);

  if (loading) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-4 py-4 border-b border-border">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
          Midda
        </h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/innstillinger")}
        >
          <Settings className="h-5 w-5" />
        </Button>
      </header>
      
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold text-foreground">
            Velkommen til Midda
          </h2>
          <p className="mt-4 text-muted-foreground">
            Din husstand er klar!
          </p>
        </div>
      </main>
    </div>
  );
};

export default Home;
