import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
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
        .single();

      if (!profile?.current_household_id) {
        navigate("/velg-husstand");
        return;
      }

      setLoading(false);
    };

    checkAuthAndHousehold();
  }, [navigate]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Kunne ikke logge ut");
    } else {
      toast.success("Logget ut");
      navigate("/auth");
    }
  };

  if (loading) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-4 py-4 border-b border-border">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Midda
        </h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSignOut}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          Logg ut
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
