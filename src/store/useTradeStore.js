import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useTradeStore = create((set) => ({
  trades: [],
  loading: false,
  filters: {
    broker_id: '',
    strategy_id: '',
    trade_type: '',
    direction: '',
    status: '',
    symbol: '',
    from_date: '',
    to_date: '',
  },

  setFilter: (key, val) => set((s) => ({
    filters: { ...s.filters, [key]: val }
  })),

  clearFilters: () => set({
    filters: {
      broker_id: '', strategy_id: '', trade_type: '',
      direction: '', status: '', symbol: '', from_date: '', to_date: '',
    }
  }),

  fetchTrades: async (filters = {}) => {
  set({ loading: true })
  let query = supabase
    .from('trades')
    .select(`
      *,
      brokers(id, name, broker_key),
      strategies(id, name)
    `)
    .order('entry_date', { ascending: false })

  if (filters.broker_id) query = query.eq('broker_id', filters.broker_id)
  if (filters.strategy_id) query = query.eq('strategy_id', filters.strategy_id)
  if (filters.trade_type) query = query.eq('trade_type', filters.trade_type)
  if (filters.direction) query = query.eq('direction', filters.direction)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.symbol) query = query.ilike('symbol', `%${filters.symbol}%`)
  if (filters.from_date) query = query.gte('entry_date', filters.from_date)
  if (filters.to_date) query = query.lte('entry_date', filters.to_date + 'T23:59:59')

  const { data, error } = await query

  if (error) {
    console.error('fetchTrades error:', error)
    set({ loading: false })
    return
  }

  set({ trades: data || [] })
  set({ loading: false })
},

  deleteTrade: async (id) => {
    const { error } = await supabase.from('trades').delete().eq('id', id)
    if (!error) set((s) => ({ trades: s.trades.filter((t) => t.id !== id) }))
    return { error }
  },
}))

export default useTradeStore