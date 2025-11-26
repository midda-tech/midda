import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Home, Copy, Check, Edit2, X, Users } from "lucide-react";
import { toast } from "sonner";
import { Household } from "@/types/household";
import { useHouseholdMembers } from "@/hooks/useHouseholdMembers";
import { JoinHouseholdDialog } from "./JoinHouseholdDialog";

interface HouseholdSectionProps {
  currentHousehold: Household | null;
  allHouseholds: Household[];
  onHouseholdChange: (householdId: string) => void;
  onHouseholdUpdate: (updatedHousehold: Household) => void;
  onHouseholdJoined: () => void;
}

export const HouseholdSection = ({
  currentHousehold,
  allHouseholds,
  onHouseholdChange,
  onHouseholdUpdate,
  onHouseholdJoined,
}: HouseholdSectionProps) => {
  const [codeCopied, setCodeCopied] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const { members, loading: loadingMembers } = useHouseholdMembers(currentHousehold?.id);

  if (!currentHousehold) return null;

  const handleCopyInviteCode = async () => {
    if (currentHousehold.invite_code) {
      await navigator.clipboard.writeText(currentHousehold.invite_code);
      setCodeCopied(true);
      toast.success("Invitasjonskode kopiert");
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleStartEdit = () => {
    setEditedName(currentHousehold.household_name);
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!editedName.trim()) {
      toast.error("Husstandsnavn kan ikke være tomt");
      return;
    }

    try {
      const { error } = await supabase
        .from("households")
        .update({ household_name: editedName.trim() })
        .eq("id", currentHousehold.id);

      if (error) throw error;

      onHouseholdUpdate({ ...currentHousehold, household_name: editedName.trim() });
      setIsEditingName(false);
      toast.success("Husstandsnavn oppdatert");
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke oppdatere husstandsnavn");
    }
  };

  const handleCancelEdit = () => {
    setEditedName("");
    setIsEditingName(false);
  };

  const handleHouseholdSwitch = async (householdId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ikke autentisert");

      const { error } = await supabase
        .from("profiles")
        .update({ current_household_id: householdId })
        .eq("id", user.id);

      if (error) throw error;

      onHouseholdChange(householdId);
      toast.success("Byttet husstand");
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke bytte husstand");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Home className="h-5 w-5" />
          Husstand
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Household Switcher */}
        {allHouseholds.length > 1 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Bytt husstand</Label>
            <Select value={currentHousehold.id} onValueChange={handleHouseholdSwitch}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allHouseholds.map((household) => (
                  <SelectItem key={household.id} value={household.id}>
                    {household.household_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Edit Household Name */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">Husstandsnavn</Label>
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="Husstandsnavn"
                className="flex-1"
              />
              <Button variant="ghost" size="icon" onClick={handleSaveName}>
                <Check className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleCancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-foreground font-medium flex-1">
                {currentHousehold.household_name}
              </p>
              <Button variant="ghost" size="icon" onClick={handleStartEdit}>
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Invite Code */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">Invitasjonskode</Label>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-muted rounded-md text-foreground font-mono text-lg tracking-wider">
              {currentHousehold.invite_code}
            </code>
            <Button variant="outline" size="icon" onClick={handleCopyInviteCode}>
              {codeCopied ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Del denne koden med andre for å invitere dem til husstanden
          </p>
        </div>

        {/* Household Members */}
        <div className="space-y-3 rounded-lg bg-muted/30 p-4 border border-border/50">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Medlemmer
            </Label>
            <span className="text-xs text-muted-foreground">
              {members.length}/8
            </span>
          </div>
          {loadingMembers ? (
            <p className="text-sm text-muted-foreground">Laster...</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Ingen medlemmer lastet ennå</p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.user_id}
                  className="text-sm text-foreground"
                >
                  {member.first_name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Household */}
        <JoinHouseholdDialog onHouseholdJoined={onHouseholdJoined} />
      </CardContent>
    </Card>
  );
};
