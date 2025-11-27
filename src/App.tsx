import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SelectHousehold from "./pages/SelectHousehold";
import Home from "./pages/Home";
import Recipes from "./pages/Recipes";
import NewRecipe from "./pages/NewRecipe";
import ViewRecipe from "./pages/ViewRecipe";
import EditRecipe from "./pages/EditRecipe";
import ShoppingLists from "./pages/ShoppingLists";
import NewShoppingList from "./pages/NewShoppingList";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/velg-husstand" element={<SelectHousehold />} />
          <Route path="/hjem" element={<Home />} />
          <Route path="/oppskrifter" element={<Recipes />} />
          <Route path="/oppskrifter/ny" element={<NewRecipe />} />
          <Route path="/oppskrifter/:id" element={<ViewRecipe />} />
          <Route path="/oppskrifter/:id/rediger" element={<EditRecipe />} />
          <Route path="/handlelister" element={<ShoppingLists />} />
          <Route path="/handlelister/ny" element={<NewShoppingList />} />
          <Route path="/innstillinger" element={<Settings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
