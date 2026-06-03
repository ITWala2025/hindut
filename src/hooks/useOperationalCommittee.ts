import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { TeamMember } from '@/data/team'

interface OpCommitteeRow {
  id: string
  name: string
  origin: string | null
  role: string
  bio: string | null
  sort_order: number
  active: boolean
  image_url: string | null
}

function toTeamMember(row: OpCommitteeRow): TeamMember {
  return {
    id: row.id,
    name: row.name,
    origin: row.origin ?? '',
    role: row.role,
    bio: row.bio ?? '',
    image_url: row.image_url ?? undefined,
  }
}

export function useOperationalCommittee() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('operational_committee_members')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message)
        } else {
          setMembers((data as OpCommitteeRow[]).map(toTeamMember))
        }
        setLoading(false)
      })
  }, [])

  return { members, loading, error }
}
