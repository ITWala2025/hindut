import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { TeamMember } from '@/data/team'

interface TeamRow {
  id: string
  name: string
  origin: string | null
  role: string
  bio: string | null
  sort_order: number
  active: boolean
}

function toTeamMember(row: TeamRow): TeamMember {
  return {
    id: row.id,
    name: row.name,
    origin: row.origin ?? '',
    role: row.role,
    bio: row.bio ?? '',
  }
}

/**
 * Fetches active team members from `public.team_members` ordered by sort_order.
 */
export function useTeam() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('team_members')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message)
        } else {
          setTeamMembers((data as TeamRow[]).map(toTeamMember))
        }
        setLoading(false)
      })
  }, [])

  return { teamMembers, loading, error }
}
