import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HouseholdMember } from "@/types/household";

export const useHouseholdMembers = (householdId: string | undefined) => {
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!householdId) {
      setLoading(false);
      return;
    }

    const fetchMembers = async () => {
      try {
        // Get member user IDs for this household
        const { data: memberData, error: membersError } = await supabase
          .from("household_members")
          .select("user_id, joined_at")
          .eq("household_id", householdId)
          .order("joined_at", { ascending: true });

        if (membersError) throw membersError;
        
        if (!memberData || memberData.length === 0) {
          setMembers([]);
          setLoading(false);
          return;
        }

        // Use the secure view that doesn't expose email
        const userIds = memberData.map(m => m.user_id);
        const { data: profileData, error: profilesError } = await supabase
          .from("household_member_profiles")
          .select("id, first_name, last_name")
          .in("id", userIds);

        if (profilesError) throw profilesError;

        const formattedMembers = memberData.map(member => {
          const profile = profileData?.find(p => p.id === member.user_id);
          return {
            user_id: member.user_id,
            first_name: profile?.first_name || "",
            last_name: profile?.last_name || "",
          };
        });

        setMembers(formattedMembers);
      } catch (error) {
        console.error("Error fetching household members:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [householdId]);

  return { members, loading };
};
