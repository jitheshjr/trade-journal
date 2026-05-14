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

  recalculateBrokerCapital: async (id) => {
    if (!id) return { data: null, error: null }

    const { data: broker, error: brokerError } = await supabase
      .from('brokers')
      .select('id, initial_capital')
      .eq('id', id)
      .single()

    if (brokerError) return { data: null, error: brokerError }

    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('net_pnl')
      .eq('broker_id', id)
      .eq('status', 'CLOSED')
      .not('net_pnl', 'is', null)

    if (tradesError) return { data: null, error: tradesError }

    const closedPnl = (trades || []).reduce((sum, trade) => (
      sum + Number(trade.net_pnl || 0)
    ), 0)
    const currentCapital = Number(broker.initial_capital || 0) + closedPnl

    const { data, error } = await supabase
      .from('brokers')
      .update({ current_capital: currentCapital })
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
