import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link, Camera, PenLine } from "lucide-react";

interface NewRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewRecipeDialog({ open, onOpenChange }: NewRecipeDialogProps) {
  const navigate = useNavigate();

  const handleUrl = () => {
    onOpenChange(false);
    navigate("/app/oppskrifter/fra-url");
  };

  const handleImage = () => {
    onOpenChange(false);
    navigate("/app/oppskrifter/fra-bilde");
  };

  const handleManual = () => {
    onOpenChange(false);
    navigate("/app/oppskrifter/ny");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-center">
            Ny oppskrift
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          <Button
            variant="outline"
            className="h-20 justify-start gap-4 px-6"
            onClick={handleUrl}
          >
            <Link className="h-6 w-6 text-primary" />
            <div className="text-left">
              <div className="font-medium">Legg til fra URL</div>
              <div className="text-sm text-muted-foreground">
                Lim inn en lenke til en oppskrift
              </div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-20 justify-start gap-4 px-6"
            onClick={handleImage}
          >
            <Camera className="h-6 w-6 text-primary" />
            <div className="text-left">
              <div className="font-medium">Last opp bilde</div>
              <div className="text-sm text-muted-foreground">
                Midda legger inn oppskriften for deg
              </div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-20 justify-start gap-4 px-6"
            onClick={handleManual}
          >
            <PenLine className="h-6 w-6 text-primary" />
            <div className="text-left">
              <div className="font-medium">Skriv inn manuelt</div>
              <div className="text-sm text-muted-foreground">
                Fyll ut oppskriften selv
              </div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
