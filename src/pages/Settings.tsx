import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LogOut, User, Home, Settings as SettingsIcon, Copy, Check, Edit2, X } from "lucide-react";
import { toast } from "sonner";

interface Profile {
  first_name: string;
  last_name: string;
  email: string;
}

interface Household {
  id: string;
  household_name: string;
  invite_code: string;
  created_by: string;
  default_servings: number | null;
}

const Settings = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [defaultServings, setDefaultServings] = useState<string>("4");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [isEditingHouseholdName, setIsEditingHouseholdName] = useState(false);
  const [editedHouseholdName, setEditedHouseholdName] = useState("");

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("first_name, last_name, email, current_household_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileData) {
        setProfile({
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          email: profileData.email,
        });

        if (profileData.current_household_id) {
          const { data: householdData } = await supabase
            .from("households")
            .select("id, household_name, invite_code, created_by, default_servings")
            .eq("id", profileData.current_household_id)
            .maybeSingle();

          if (householdData) {
            setHousehold(householdData);
            setEditedHouseholdName(householdData.household_name);
            setDefaultServings(householdData.default_servings?.toString() || "4");
          }
        }
      }

      setLoading(false);
    };

    loadData();
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

  const handleSaveServings = async () => {
    if (!household) {
      toast.error("Ingen husstand valgt");
      return;
    }

    const servings = parseInt(defaultServings);
    if (isNaN(servings) || servings < 1 || servings > 20) {
      toast.error("Vennligst skriv inn et tall mellom 1 og 20");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("households")
        .update({ default_servings: servings })
        .eq("id", household.id);

      if (error) throw error;

      toast.success("Standard porsjoner oppdatert");
      setHousehold(prev => prev ? { ...prev, default_servings: servings } : null);
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke oppdatere innstillinger");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyInviteCode = async () => {
    if (household?.invite_code) {
      await navigator.clipboard.writeText(household.invite_code);
      setCodeCopied(true);
      toast.success("Invitasjonskode kopiert");
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleSaveHouseholdName = async () => {
    if (!household || !editedHouseholdName.trim()) {
      toast.error("Husstandsnavn kan ikke være tomt");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ikke autentisert");

      const { error } = await supabase
        .from("households")
        .update({ household_name: editedHouseholdName.trim() })
        .eq("id", household.id);

      if (error) throw error;

      setHousehold({ ...household, household_name: editedHouseholdName.trim() });
      setIsEditingHouseholdName(false);
      toast.success("Husstandsnavn oppdatert");
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke oppdatere husstandsnavn");
    }
  };

  const handleCancelEdit = () => {
    if (household) {
      setEditedHouseholdName(household.household_name);
    }
    setIsEditingHouseholdName(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Laster inn...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-4 py-4 border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/hjem")}
        >
          ← Tilbake
        </Button>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
          Innstillinger
        </h1>
        <div className="w-20" />
      </header>

      <main className="flex-1 p-4 space-y-4 max-w-2xl mx-auto w-full">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <User className="h-5 w-5" />
              Profil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm text-muted-foreground">Navn</Label>
              <p className="text-foreground font-medium">
                {profile?.first_name} {profile?.last_name}
              </p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">E-post</Label>
              <p className="text-foreground font-medium">{profile?.email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Household Section */}
        {household && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Home className="h-5 w-5" />
                Husstand
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Aktiv husstand</Label>
                {isEditingHouseholdName ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={editedHouseholdName}
                      onChange={(e) => setEditedHouseholdName(e.target.value)}
                      placeholder="Husstandsnavn"
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleSaveHouseholdName}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCancelEdit}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-foreground font-medium flex-1">{household.household_name}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsEditingHouseholdName(true)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Invitasjonskode</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 px-3 py-2 bg-muted rounded-md text-foreground font-mono text-lg tracking-wider">
                    {household.invite_code}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyInviteCode}
                  >
                    {codeCopied ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Del denne koden med andre for å invitere dem til husstanden
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* App Settings Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <SettingsIcon className="h-5 w-5" />
              App-innstillinger
            </CardTitle>
            <CardDescription>
              Tilpass hvordan appen fungerer for deg
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultServings">Standard porsjoner</Label>
              <div className="flex gap-2">
                <Input
                  id="defaultServings"
                  type="number"
                  min="1"
                  max="20"
                  value={defaultServings}
                  onChange={(e) => setDefaultServings(e.target.value)}
                  className="max-w-[120px]"
                />
                <Button
                  onClick={handleSaveServings}
                  disabled={saving || defaultServings === household?.default_servings?.toString()}
                >
                  {saving ? "Lagrer..." : "Lagre"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Standard antall porsjoner for hele husstanden når dere lager handlelister
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Account Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Konto</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="w-full gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logg ut
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Settings;
