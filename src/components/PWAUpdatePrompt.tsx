import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

export function PWAUpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      // Check for updates every 60 seconds
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error("SW registration error:", error);
    },
  });

  useEffect(() => {
    if (needRefresh && !showPrompt) {
      setShowPrompt(true);
      toast("Ny versjon tilgjengelig", {
        description: "Oppdater for å få siste versjon av Midda.",
        duration: Infinity,
        action: {
          label: "Oppdater",
          onClick: () => {
            updateServiceWorker(true);
          },
        },
        icon: <RefreshCw className="h-4 w-4" />,
      });
    }
  }, [needRefresh, showPrompt, updateServiceWorker]);

  return null;
}
