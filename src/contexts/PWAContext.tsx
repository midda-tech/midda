import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

interface PWAContextType {
  needRefresh: boolean;
  checkForUpdates: () => Promise<void>;
  updateApp: () => void;
  isChecking: boolean;
}

const PWAContext = createContext<PWAContextType | null>(null);

export function PWAProvider({ children }: { children: ReactNode }) {
  const [showedToast, setShowedToast] = useState(false);

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

  // Show toast when update is available
  useEffect(() => {
    if (needRefresh && !showedToast) {
      setShowedToast(true);
      toast("Ny versjon tilgjengelig", {
        id: "pwa-update", // Prevent duplicate toasts
        description: "Oppdater for å få siste versjon av Midda.",
        duration: Infinity,
        action: {
          label: "Oppdater",
          onClick: () => {
            toast.dismiss("pwa-update");
            updateServiceWorker(true);
          },
        },
        icon: <RefreshCw className="h-4 w-4" />,
      });
    }
  }, [needRefresh, showedToast, updateServiceWorker]);

  const checkForUpdates = async () => {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.update();
    }
  };

  const updateApp = () => {
    updateServiceWorker(true);
  };

  return (
    <PWAContext.Provider
      value={{
        needRefresh,
        checkForUpdates,
        updateApp,
        isChecking: false,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
}

export function usePWA() {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error("usePWA must be used within a PWAProvider");
  }
  return context;
}
