import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useStrategyStore = create((set) => ({
  strategies: [],
  loading: false,

  fetchStrategies: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('strategies')
      .select('*')
      .order('created_at', { ascending: true })

    if (!error) set({ strategies: data })
    set({ loading: false })
  },

  addStrategy: async (strategy) => {
    const { data, error } = await supabase
      .from('strategies')
      .insert(strategy)
      .select()
      .single()

    if (!error) set((s) => ({ strategies: [...s.strategies, data] }))
    return { data, error }
  },

  deleteStrategy: async (id) => {
    const { error } = await supabase.from('strategies').delete().eq('id', id)
    if (!error) set((s) => ({ strategies: s.strategies.filter((st) => st.id !== id) }))
    return { error }
  },
}))

export default useStrategyStore