export interface AuthUser {
  id: number;
  email: string;
  username: string;
  full_name?: string | null;
  is_active: boolean;
  is_superuser: boolean;
  restaurant_id: string | null;
  created_at: string;
}
