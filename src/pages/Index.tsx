import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChefHat, ShoppingCart, Users, Sparkles } from "lucide-react";

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

  const features = [
    {
      icon: ChefHat,
      title: "Oppskrifter",
      description: "Samle alle favorittoppskriftene dine på ett sted"
    },
    {
      icon: ShoppingCart,
      title: "Handlelister",
      description: "Generer smarte handlelister automatisk"
    },
    {
      icon: Users,
      title: "Husstand",
      description: "Del oppskrifter og lister med familien"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/30 flex flex-col overflow-hidden">
      {/* Decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="relative w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display text-2xl font-bold text-foreground">Midda</span>
        </div>
        <Button onClick={handleMainAction} className="font-semibold shadow-soft">
          {isAuthenticated ? "Åpne appen" : "Logg inn"}
        </Button>
      </nav>

      {/* Hero Section */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="animate-fade-in">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Middagsplanlegging gjort enkelt
            </span>
          </div>
          
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-foreground leading-tight tracking-tight animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Enkel. Smart.{" "}
            <span className="text-primary">Midda.</span>
          </h1>
          
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Planlegg ukens middager, lag handlelistene dine automatisk, og spar tid hver eneste dag.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Button 
              size="lg" 
              onClick={handleMainAction}
              className="font-semibold text-lg px-8 shadow-medium hover:shadow-strong transition-shadow"
            >
              {isAuthenticated ? "Åpne appen" : "Kom i gang"}
            </Button>
          </div>
        </div>

        {/* Feature cards */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto w-full">
          {features.map((feature, index) => (
            <div 
              key={feature.title}
              className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6 text-center hover:bg-card/80 hover:border-border transition-all duration-300 hover:-translate-y-1 hover:shadow-soft animate-fade-in"
              style={{ animationDelay: `${0.4 + index * 0.1}s` }}
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative w-full px-6 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Gjør middagsplanleggingen enklere for hele familien
        </p>
      </footer>
    </div>
  );
};

export default Index;
