import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface JoinHouseholdDialogProps {
  onHouseholdJoined: () => void;
}

export const JoinHouseholdDialog = ({ onHouseholdJoined }: JoinHouseholdDialogProps) => {
  const [open, setOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [newHouseholdName, setNewHouseholdName] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleJoinHousehold = async () => {
    if (!inviteCode.trim()) {
      toast.error("Vennligst skriv inn invitasjonskode");
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc("join_household_by_invite", {
        p_invite_code: inviteCode.trim().toUpperCase(),
      });

      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ikke autentisert");

      const result = data as { household_id: string; household_name: string };
      
      await supabase
        .from("profiles")
        .update({ current_household_id: result.household_id })
        .eq("id", user.id);

      toast.success(`Ble med i ${result.household_name}`);
      setOpen(false);
      setInviteCode("");
      onHouseholdJoined();
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke bli med i husstand");
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateHousehold = async () => {
    if (!newHouseholdName.trim()) {
      toast.error("Vennligst skriv inn et navn på husstanden");
      return;
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ikke autentisert");

      const { data: householdData, error: householdError } = await supabase
        .from("households")
        .insert({
          household_name: newHouseholdName.trim(),
          created_by: user.id,
          default_servings: 4,
        })
        .select()
        .single();

      if (householdError) throw householdError;

      await supabase
        .from("profiles")
        .update({ current_household_id: householdData.id })
        .eq("id", user.id);

      toast.success(`Opprettet ${householdData.household_name}`);
      setOpen(false);
      setNewHouseholdName("");
      onHouseholdJoined();
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke opprette husstand");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Legg til husstand
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Legg til husstand</DialogTitle>
          <DialogDescription>
            Bli med i en eksisterende husstand eller opprett en ny
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="join" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="join">Bli med</TabsTrigger>
            <TabsTrigger value="create">Opprett ny</TabsTrigger>
          </TabsList>
          
          <TabsContent value="join" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-code">Invitasjonskode</Label>
              <Input
                id="invite-code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                className="font-mono tracking-wider"
              />
              <p className="text-xs text-muted-foreground">
                Skriv inn invitasjonskoden du har fått
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  setInviteCode("");
                }}
              >
                Avbryt
              </Button>
              <Button onClick={handleJoinHousehold} disabled={processing}>
                {processing ? "Blir med..." : "Bli med"}
              </Button>
            </DialogFooter>
          </TabsContent>
          
          <TabsContent value="create" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="household-name">Husstandsnavn</Label>
              <Input
                id="household-name"
                value={newHouseholdName}
                onChange={(e) => setNewHouseholdName(e.target.value)}
                placeholder="Familie Hansen"
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                Velg et navn på den nye husstanden
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  setNewHouseholdName("");
                }}
              >
                Avbryt
              </Button>
              <Button onClick={handleCreateHousehold} disabled={processing}>
                {processing ? "Oppretter..." : "Opprett"}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
