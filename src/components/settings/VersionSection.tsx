import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Check } from "lucide-react";
import { usePWA } from "@/contexts/PWAContext";
import { toast } from "sonner";

// Build timestamp injected at build time via vite.config.ts define
const BUILD_TIME = typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : new Date().toISOString();

export function VersionSection() {
  const { checkForUpdates } = usePWA();
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckForUpdates = async () => {
    setIsChecking(true);
    try {
      await checkForUpdates();
      // Small delay to allow service worker to detect updates
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success("Du har siste versjon");
    } catch (error) {
      toast.error("Kunne ikke sjekke for oppdateringer");
    } finally {
      setIsChecking(false);
    }
  };

  const formatBuildTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString("nb-NO", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return timestamp;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Versjon</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Sist oppdatert</p>
            <p className="text-sm font-medium">{formatBuildTime(BUILD_TIME)}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCheckForUpdates}
            disabled={isChecking}
            className="gap-2"
          >
            {isChecking ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {isChecking ? "Sjekker..." : "Sjekk oppdateringer"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
