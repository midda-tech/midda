import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { HouseholdSection } from "@/components/settings/HouseholdSection";
import { AppSettingsSection } from "@/components/settings/AppSettingsSection";
import { ShoppingListCategoriesSection } from "@/components/settings/ShoppingListCategoriesSection";
import { AccountSection } from "@/components/settings/AccountSection";
import { VersionSection } from "@/components/settings/VersionSection";
import { Household } from "@/types/household";

interface Profile {
  first_name: string;
  last_name: string;
  email: string;
}

const Settings = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentHousehold, setCurrentHousehold] = useState<Household | null>(null);
  const [allHouseholds, setAllHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/logg-inn");
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

      // Fetch all households the user is a member of
      const { data: memberData } = await supabase
        .from("household_members")
        .select("household_id")
        .eq("user_id", user.id);

      if (memberData && memberData.length > 0) {
        const householdIds = memberData.map((m) => m.household_id);
        
        const { data: householdsData } = await supabase
          .from("households")
          .select("id, household_name, invite_code, created_by, default_servings, shopping_list_categories")
          .in("id", householdIds);

        if (householdsData) {
          setAllHouseholds(householdsData);
          
          // Set current household
          const current = householdsData.find(
            (h) => h.id === profileData.current_household_id
          );
          if (current) {
            setCurrentHousehold(current);
          }
        }
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [navigate]);

  const handleHouseholdChange = async (householdId: string) => {
    // Reload all data to ensure everything is fresh for the new household
    await loadData();
  };

  const handleHouseholdUpdate = (updatedHousehold: Household) => {
    setCurrentHousehold(updatedHousehold);
    setAllHouseholds((prev) =>
      prev.map((h) => (h.id === updatedHousehold.id ? updatedHousehold : h))
    );
  };

  const handleDefaultServingsChange = (servings: number) => {
    if (currentHousehold) {
      const updated = { ...currentHousehold, default_servings: servings };
      setCurrentHousehold(updated);
      setAllHouseholds((prev) =>
        prev.map((h) => (h.id === updated.id ? updated : h))
      );
    }
  };

  const handleCategoriesChange = (categories: string[]) => {
    if (currentHousehold) {
      const updated = { ...currentHousehold, shopping_list_categories: categories };
      setCurrentHousehold(updated);
      setAllHouseholds((prev) =>
        prev.map((h) => (h.id === updated.id ? updated : h))
      );
    }
  };

  const handleHouseholdJoined = () => {
    loadData();
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
          onClick={() => navigate("/app")}
        >
          ← Tilbake
        </Button>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
          Innstillinger
        </h1>
        <div className="w-20" />
      </header>

      <main className="flex-1 p-4 space-y-4 max-w-2xl mx-auto w-full">
        <ProfileSection profile={profile} />

        <HouseholdSection
          currentHousehold={currentHousehold}
          allHouseholds={allHouseholds}
          onHouseholdChange={handleHouseholdChange}
          onHouseholdUpdate={handleHouseholdUpdate}
          onHouseholdJoined={handleHouseholdJoined}
        />

        {currentHousehold && (
          <>
            <AppSettingsSection
              householdId={currentHousehold.id}
              defaultServings={currentHousehold.default_servings?.toString() || "4"}
              onDefaultServingsChange={handleDefaultServingsChange}
            />
            <ShoppingListCategoriesSection
              householdId={currentHousehold.id}
              categories={currentHousehold.shopping_list_categories || []}
              onCategoriesChange={handleCategoriesChange}
            />
          </>
        )}

        <AccountSection />

        <VersionSection />
      </main>
    </div>
  );
};

export default Settings;
