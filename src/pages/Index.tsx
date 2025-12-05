import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleMainAction = () => {
    if (isAuthenticated) {
      navigate("/app");
    } else {
      navigate("/logg-inn");
    }
  };

  if (isAuthenticated === null) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation */}
      <nav className="w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-display text-2xl font-bold text-foreground">Midda</span>
        </div>
        <Button onClick={handleMainAction} className="font-semibold">
          {isAuthenticated ? "Åpne appen" : "Logg inn"}
        </Button>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-foreground leading-tight tracking-tight">
            Enkel. Smart. Midda.
          </h1>
          
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Planlegg ukens middager, lag handlelistene dine automatisk, og spar tid hver eneste dag.
          </p>

          <div className="pt-4">
            <Button 
              size="lg" 
              onClick={handleMainAction} 
              className="text-lg px-8 py-6 font-semibold shadow-soft hover:shadow-medium transition-all"
            >
              {isAuthenticated ? "Åpne appen" : "Kom i gang"}
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-6 text-center text-sm text-muted-foreground">
        <p>Gjør middagsplanleggingen enklere for hele familien</p>
      </footer>
    </div>
  );
};

export default Index;
