import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChefHat } from "lucide-react";
import heroShopping from "@/assets/hero-shopping.jpg";
import heroCooking from "@/assets/hero-cooking.jpg";

const Index = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // User is logged in, redirect to household selection
        navigate("/velg-husstand");
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/velg-husstand");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Decorative Images */}
      <div className="absolute bottom-0 left-0 w-1/3 max-w-md opacity-90 hidden lg:block animate-fade-in pointer-events-none">
        <img 
          src={heroShopping} 
          alt="" 
          className="w-full h-auto object-contain"
        />
      </div>
      <div className="absolute bottom-0 right-0 w-1/3 max-w-md opacity-90 hidden lg:block animate-fade-in pointer-events-none">
        <img 
          src={heroCooking} 
          alt="" 
          className="w-full h-auto object-contain"
        />
      </div>

      {/* Navigation */}
      <nav className="w-full px-6 py-4 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <ChefHat className="w-8 h-8 text-primary" strokeWidth={2.5} />
          <span className="font-display text-2xl font-bold text-foreground">Midda</span>
        </div>
        <Button 
          onClick={() => navigate("/auth")}
          className="font-semibold"
        >
          Kom i gang
        </Button>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-foreground leading-tight tracking-tight">
            Enkel. Smart.
            <br />
            Middagsplanlegging.
          </h1>
          
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Planlegg ukens middager, lag handlelistene dine automatisk, og spar tid hver eneste dag.
          </p>

          <div className="pt-4">
            <Button 
              size="lg"
              onClick={() => navigate("/auth")}
              className="text-lg px-8 py-6 font-semibold shadow-soft hover:shadow-medium transition-all"
            >
              Start gratis i dag
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-6 text-center text-sm text-muted-foreground relative z-10">
        <p>Gjør middagsplanleggingen enklere for hele familien</p>
      </footer>
    </div>
  );
};

export default Index;
