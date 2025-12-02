export interface Household {
  id: string;
  household_name: string;
  invite_code: string;
  created_by: string;
  default_servings: number | null;
  shopping_list_categories: string[] | null;
}

export interface HouseholdMember {
  user_id: string;
  first_name: string;
  last_name: string;
}
