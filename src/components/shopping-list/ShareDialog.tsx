import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Share2, Copy, Check, Link2Off } from "lucide-react";
import { toast } from "sonner";

interface ShareDialogProps {
  listId: string;
  shareToken: string | null;
  onTokenChange: (token: string | null) => void;
}

const ShareDialog = ({ listId, shareToken, onTokenChange }: ShareDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = shareToken 
    ? `${window.location.origin}/delt/${shareToken}`
    : null;

  const generateShareLink = async () => {
    setLoading(true);
    try {
      const newToken = crypto.randomUUID();
      
      const { error } = await supabase
        .from("shopping_lists")
        .update({ share_token: newToken })
        .eq("id", listId);

      if (error) throw error;

      onTokenChange(newToken);
      toast.success("Delenke opprettet");
    } catch (error) {
      console.error("Error generating share link:", error);
      toast.error("Kunne ikke opprette delenke");
    } finally {
      setLoading(false);
    }
  };

  const revokeShareLink = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("shopping_lists")
        .update({ share_token: null })
        .eq("id", listId);

      if (error) throw error;

      onTokenChange(null);
      toast.success("Deling deaktivert");
    } catch (error) {
      console.error("Error revoking share link:", error);
      toast.error("Kunne ikke deaktivere deling");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Lenke kopiert");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Kunne ikke kopiere lenke");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Share2 className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Del handleliste</DialogTitle>
          <DialogDescription>
            Del denne handlelisten med andre. De kan se og redigere varene, men ikke slette listen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {shareToken ? (
            <>
              <div className="flex gap-2">
                <Input 
                  value={shareUrl || ""} 
                  readOnly 
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={revokeShareLink}
                disabled={loading}
              >
                <Link2Off className="h-4 w-4 mr-2" />
                Slutt å dele
              </Button>
            </>
          ) : (
            <Button
              className="w-full"
              onClick={generateShareLink}
              disabled={loading}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Opprett delenke
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
