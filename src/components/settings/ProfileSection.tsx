import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { User } from "lucide-react";

interface ProfileSectionProps {
  profile: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export const ProfileSection = ({ profile }: ProfileSectionProps) => {
  if (!profile) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <User className="h-5 w-5" />
          Profil
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-sm text-muted-foreground">Navn</Label>
          <p className="text-foreground font-medium">
            {profile.first_name} {profile.last_name}
          </p>
        </div>
        <div>
          <Label className="text-sm text-muted-foreground">E-post</Label>
          <p className="text-foreground font-medium">{profile.email}</p>
        </div>
      </CardContent>
    </Card>
  );
};
