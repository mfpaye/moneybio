import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { I18nProvider } from './lib/i18n.jsx'
import Layout from './components/Layout'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Expenses from './pages/Expenses'
import Income from './pages/Income'
import Loans from './pages/Loans'
import Medical from './pages/Medical'
import ScanPrices from './pages/ScanPrices'
import ShoppingList from './pages/ShoppingList'
import PriceCompare from './pages/PriceCompare'
import Analytics from './pages/Analytics'
import Voice from './pages/Voice'
import Settings from './pages/Settings'
import Sharing from './pages/Sharing'
import Spaces from './pages/Spaces'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontSize:14, color:'#9C9A94' }}>Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontSize:14, color:'#9C9A94' }}>Loading…</div>
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="voice" element={<Voice />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="income" element={<Income />} />
        <Route path="loans" element={<Loans />} />
        <Route path="medical" element={<Medical />} />
        <Route path="scan" element={<ScanPrices />} />
        <Route path="list" element={<ShoppingList />} />
        <Route path="compare" element={<PriceCompare />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="sharing" element={<Sharing />} />
        <Route path="spaces" element={<Spaces />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  )
}
