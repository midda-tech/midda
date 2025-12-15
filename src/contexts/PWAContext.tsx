import { createContext, useContext, ReactNode, useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

// How often to check for updates (in minutes)
const UPDATE_CHECK_INTERVAL_MINUTES = 5;

interface PWAContextType {
  needRefresh: boolean;
  checkForUpdates: () => Promise<void>;
  updateApp: () => void;
}

const PWAContext = createContext<PWAContextType | null>(null);

export function PWAProvider({ children }: { children: ReactNode }) {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      if (registration) {
        setInterval(() => {
          registration.update();
        }, UPDATE_CHECK_INTERVAL_MINUTES * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error("SW registration error:", error);
    },
  });

  // Auto-update when new version is available
  useEffect(() => {
    if (needRefresh) {
      updateServiceWorker(true);
    }
  }, [needRefresh, updateServiceWorker]);

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
