import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, ShoppingCart, Settings } from "lucide-react";

export const AppHeader = () => {
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between px-4 py-4 border-b border-border">
      <h1 
        className="font-serif text-2xl font-bold tracking-tight text-foreground cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => navigate("/hjem")}
      >
        Midda
      </h1>
      <nav className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate("/oppskrifter")}>
          <BookOpen className="h-4 w-4" />
          <span className="hidden sm:inline">Oppskrifter</span>
        </Button>
        <Button variant="ghost" size="sm" className="gap-2">
          <ShoppingCart className="h-4 w-4" />
          <span className="hidden sm:inline">Handlelister</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/innstillinger")}
        >
          <Settings className="h-5 w-5" />
        </Button>
      </nav>
    </header>
  );
};
