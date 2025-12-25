import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const isLovablePreview = () => {
  const hostname = window.location.hostname;
  return hostname.includes(".lovableproject.com") || 
         (hostname.includes("id-preview--") && hostname.includes(".lovable.app"));
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/app");
        return;
      }
      
      // Auto-login in Lovable Preview only
      if (isLovablePreview()) {
        const { error } = await supabase.auth.signInWithPassword({
          email: "anders.vandvik@gmail.com",
          password: "password123",
        });
        if (!error) {
          toast.info("Dev: Auto-innlogget");
          navigate("/app");
        }
      }
    };
    checkUser();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      toast.success("Logget inn!");
      navigate("/app");
    } catch (error: any) {
      toast.error(error.message || "Noe gikk galt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-[420px] animate-fade-in">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-block">
            <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground mb-2">
              Midda
            </h1>
          </Link>
          <p className="text-sm text-muted-foreground">
            Smart måltidsplanlegging
          </p>
        </div>

        <Card className="border-border/50 shadow-medium">
          <CardHeader className="space-y-3 pb-6">
            <CardTitle className="text-2xl font-bold tracking-tight">
              Logg inn
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  E-post
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="ola@example.com"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Passord
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="h-11"
                  minLength={6}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 text-base font-medium" 
                disabled={loading}
              >
                {loading ? "Laster..." : "Logg inn"}
              </Button>
            </form>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  eller
                </span>
              </div>
            </div>

            <Link
              to="/registrer"
              className="block w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Har du ikke en konto? Registrer deg
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
