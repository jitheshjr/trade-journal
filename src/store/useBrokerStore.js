import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useBrokerStore = create((set) => ({
  brokers: [],
  loading: false,

  fetchBrokers: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('brokers')
      .select('*')
      .order('created_at', { ascending: true })

    if (!error) set({ brokers: data })
    set({ loading: false })
  },

  addBroker: async (broker) => {
    const { data, error } = await supabase
      .from('brokers')
      .insert(broker)
      .select()
      .single()

    if (!error) set((s) => ({ brokers: [...s.brokers, data] }))
    return { data, error }
  },

  updateBroker: async (id, updates) => {
    const { data, error } = await supabase
      .from('brokers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (!error) set((s) => ({
      brokers: s.brokers.map((b) => b.id === id ? data : b)
    }))
    return { data, error }
  },

  deleteBroker: async (id) => {
    const { error } = await supabase.from('brokers').delete().eq('id', id)
    if (!error) set((s) => ({ brokers: s.brokers.filter((b) => b.id !== id) }))
    return { error }
  },
}))

export default useBrokerStore