import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";

interface AppSettingsSectionProps {
  householdId: string;
  defaultServings: string;
  onDefaultServingsChange: (servings: number) => void;
}

export const AppSettingsSection = ({
  householdId,
  defaultServings,
  onDefaultServingsChange,
}: AppSettingsSectionProps) => {
  const [servings, setServings] = useState(defaultServings);
  const [saving, setSaving] = useState(false);

  // Update internal state when prop changes (e.g., household switch)
  useEffect(() => {
    setServings(defaultServings);
  }, [defaultServings]);

  const handleSave = async () => {
    const servingsNum = parseInt(servings);
    if (isNaN(servingsNum) || servingsNum < 1 || servingsNum > 20) {
      toast.error("Vennligst skriv inn et tall mellom 1 og 20");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("households")
        .update({ default_servings: servingsNum })
        .eq("id", householdId);

      if (error) throw error;

      toast.success("Standard porsjoner oppdatert");
      onDefaultServingsChange(servingsNum);
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke oppdatere innstillinger");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <SettingsIcon className="h-5 w-5" />
          App-innstillinger
        </CardTitle>
        <CardDescription>Tilpass hvordan appen fungerer for deg</CardDescription>
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
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              className="max-w-[120px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-auto [&::-webkit-outer-spin-button]:appearance-auto"
            />
            <Button
              onClick={handleSave}
              disabled={saving || servings === defaultServings}
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
  );
};
