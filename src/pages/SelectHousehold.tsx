import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Home, Users } from "lucide-react";
import { toast } from "sonner";

const SelectHousehold = () => {
  const navigate = useNavigate();
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkAuthAndHousehold = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/logg-inn");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("current_household_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profile?.current_household_id) {
        navigate("/app");
      }
    };
    checkAuthAndHousehold();
  }, [navigate]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Kunne ikke logge ut");
    } else {
      toast.success("Logget ut");
      navigate("/logg-inn");
    }
  };

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdName.trim()) {
      toast.error("Vennligst skriv inn et hustandsnavn");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ikke autentisert");

      const defaultCategories = ["Frukt og grønt", "Meieri", "Hermetikk", "Annet"];
      
      const { data: household, error: householdError } = await supabase
        .from("households")
        .insert({ 
          household_name: householdName, 
          created_by: user.id,
          shopping_list_categories: defaultCategories,
        })
        .select()
        .single();

      if (householdError) throw householdError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ current_household_id: household.id })
        .eq("id", user.id);

      if (profileError) throw profileError;

      toast.success("Husstand opprettet!");
      navigate("/app");
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke opprette husstand");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || inviteCode.length !== 6) {
      toast.error("Vennligst skriv inn en gyldig invitasjonskode (6 tegn)");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ikke autentisert");

      const { data, error } = await supabase
        .rpc("join_household_by_invite", { p_invite_code: inviteCode.toUpperCase() });

      if (error) {
        toast.error(error.message || "Ugyldig invitasjonskode");
        return;
      }

      const result = data as { household_id: string; household_name: string; message: string };

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ current_household_id: result.household_id })
        .eq("id", user.id);

      if (profileError) throw profileError;

      toast.success(`Ble med i ${result.household_name}!`);
      navigate("/app");
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke bli med i husstand");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-4 py-4 border-b border-border">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
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
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="font-serif text-3xl">Velg husstand</CardTitle>
            <CardDescription>
              Opprett en ny husstand eller bli med i en eksisterende
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="create" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="create" className="gap-2 data-[state=inactive]:text-foreground">
                  <Home className="h-4 w-4" />
                  Opprett ny
                </TabsTrigger>
                <TabsTrigger value="join" className="gap-2 data-[state=inactive]:text-foreground">
                  <Users className="h-4 w-4" />
                  Bli med
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="create" className="space-y-4 mt-6">
                <form onSubmit={handleCreateHousehold} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="householdName">Hustandsnavn</Label>
                    <Input
                      id="householdName"
                      placeholder="Familien Hansen"
                      value={householdName}
                      onChange={(e) => setHouseholdName(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Oppretter..." : "Opprett husstand"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="join" className="space-y-4 mt-6">
                <form onSubmit={handleJoinHousehold} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="inviteCode">Invitasjonskode</Label>
                    <Input
                      id="inviteCode"
                      placeholder="ABC123"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      disabled={loading}
                      className="uppercase"
                    />
                    <p className="text-xs text-muted-foreground">
                      Skriv inn 6-tegns invitasjonskoden
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Blir med..." : "Bli med i husstand"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SelectHousehold;
