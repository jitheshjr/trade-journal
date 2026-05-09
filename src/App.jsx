import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/useAuthStore'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Settings from './pages/Settings'
import TradeForm from './pages/TradeForm'
import Journal from './pages/Journal'
import Dashboard from './pages/Dashboard'
import Playbook from './pages/Playbook'
import Insights from './pages/Insights'

const Page = ({ children }) => (
  <ProtectedRoute>
    <Layout>{children}</Layout>
  </ProtectedRoute>
)

export default function App() {
  const init = useAuthStore((s) => s.init)
  useEffect(() => { init() }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Page><Dashboard /></Page>} />
        <Route path="/journal" element={<Page><Journal /></Page>} />
        <Route path="/playbook" element={<Page><Playbook /></Page>} />
        <Route path="/trade/new" element={<Page><TradeForm /></Page>} />
        <Route path="/settings" element={<Page><Settings /></Page>} />
        <Route path="/insights" element={<Page><Insights /></Page>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}