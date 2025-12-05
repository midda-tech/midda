import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

export const AccountSection = () => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Kunne ikke logge ut");
    } else {
      toast.success("Logget ut");
      navigate("/logg-inn");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Konto</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="outline" onClick={handleSignOut} className="w-full gap-2">
          <LogOut className="h-4 w-4" />
          Logg ut
        </Button>
      </CardContent>
    </Card>
  );
};
