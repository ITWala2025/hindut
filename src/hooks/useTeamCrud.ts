import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface TeamMemberRow {
  id: string
  name: string
  origin: string
  role: string
  bio: string
  sort_order: number
  active: boolean
  image_url: string | null
}

export interface TeamMemberInput {
  name: string
  origin: string
  role: string
  bio: string
  sort_order: number
  active: boolean
  image_url: string | null
}

type TableName = 'team_members' | 'operational_committee_members'

export function useTeamCrud(table: TableName) {
  const [members, setMembers] = useState<TeamMemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from(table)
      .select('*')
      .order('sort_order', { ascending: true })
    if (err) {
      setError(err.message)
    } else {
      setMembers((data ?? []) as TeamMemberRow[])
      setError(null)
    }
    setLoading(false)
  }, [table])

  useEffect(() => { fetch() }, [fetch])

  const create = async (input: TeamMemberInput): Promise<TeamMemberRow> => {
    const id = input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      + '-' + Date.now().toString(36)
    const { data, error: err } = await supabase
      .from(table)
      .insert({ id, ...input })
      .select()
      .single()
    if (err) throw new Error(err.message)
    await fetch()
    return data as TeamMemberRow
  }

  const update = async (id: string, input: Partial<TeamMemberInput>): Promise<void> => {
    const { error: err } = await supabase.from(table).update(input).eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const remove = async (id: string): Promise<void> => {
    const { error: err } = await supabase.from(table).delete().eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const reorder = async (id: string, sort_order: number): Promise<void> => {
    const { error: err } = await supabase.from(table).update({ sort_order }).eq('id', id)
    if (err) throw new Error(err.message)
  }

  return { members, loading, error, create, update, remove, reorder, refresh: fetch }
}
