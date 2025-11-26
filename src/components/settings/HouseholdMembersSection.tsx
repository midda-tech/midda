import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface HouseholdMember {
  user_id: string;
  first_name: string;
  last_name: string;
  joined_at: string;
}

interface HouseholdMembersSectionProps {
  householdId: string | null;
}

export const HouseholdMembersSection = ({ householdId }: HouseholdMembersSectionProps) => {
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!householdId) {
      setLoading(false);
      return;
    }

    const fetchMembers = async () => {
      try {
        const { data, error } = await supabase
          .from("household_members")
          .select(`
            user_id,
            joined_at,
            profiles:user_id (
              first_name,
              last_name
            )
          `)
          .eq("household_id", householdId)
          .order("joined_at", { ascending: true });

        if (error) throw error;

        const formattedMembers = data?.map((member: any) => ({
          user_id: member.user_id,
          first_name: member.profiles.first_name,
          last_name: member.profiles.last_name,
          joined_at: member.joined_at,
        })) || [];

        setMembers(formattedMembers);
      } catch (error: any) {
        console.error("Error fetching household members:", error);
        toast.error("Kunne ikke laste medlemmer");
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [householdId]);

  if (!householdId) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Users className="h-5 w-5" />
          Medlemmer
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Laster...</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen medlemmer funnet</p>
        ) : (
          <ul className="space-y-2">
            {members.map((member) => (
              <li
                key={member.user_id}
                className="text-foreground font-medium text-sm"
              >
                {member.first_name} {member.last_name}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground mt-4">
          {members.length} av 8 medlemmer
        </p>
      </CardContent>
    </Card>
  );
};
