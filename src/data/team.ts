/**
 * Team member types.
 * Data is fetched from `public.team_members` via the `useTeam` hook.
 */
export interface TeamMember {
  id: string
  name: string
  origin: string
  role: string
  bio: string
}
