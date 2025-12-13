import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import SelectHousehold from "./pages/SelectHousehold";
import Home from "./pages/Home";
import Recipes from "./pages/Recipes";
import Discover from "./pages/Discover";
import ViewSystemRecipe from "./pages/ViewSystemRecipe";
import NewRecipe from "./pages/NewRecipe";
import NewRecipeFromImage from "./pages/NewRecipeFromImage";
import ViewRecipe from "./pages/ViewRecipe";
import EditRecipe from "./pages/EditRecipe";
import ShoppingLists from "./pages/ShoppingLists";
import NewShoppingList from "./pages/NewShoppingList";
import ViewShoppingList from "./pages/ViewShoppingList";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <PWAUpdatePrompt />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Index />} />
          <Route path="/logg-inn" element={<Login />} />
          <Route path="/registrer" element={<Register />} />
          <Route path="/velg-husstand" element={<SelectHousehold />} />
          
          {/* App routes (authenticated) */}
          <Route path="/app" element={<Home />} />
          <Route path="/app/oppskrifter" element={<Recipes />} />
          <Route path="/app/oppdag" element={<Discover />} />
          <Route path="/app/oppdag/:id" element={<ViewSystemRecipe />} />
          <Route path="/app/oppskrifter/ny" element={<NewRecipe />} />
          <Route path="/app/oppskrifter/fra-bilde" element={<NewRecipeFromImage />} />
          <Route path="/app/oppskrifter/:id" element={<ViewRecipe />} />
          <Route path="/app/oppskrifter/:id/rediger" element={<EditRecipe />} />
          <Route path="/app/handlelister" element={<ShoppingLists />} />
          <Route path="/app/handlelister/ny" element={<NewShoppingList />} />
          <Route path="/app/handlelister/:id" element={<ViewShoppingList />} />
          <Route path="/app/innstillinger" element={<Settings />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
