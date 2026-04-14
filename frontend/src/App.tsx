import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Vozila from './pages/Vozila'
import Rezervacije from './pages/Rezervacije'
import Servisi from './pages/Servisi'
import Zaposleni from './pages/Zaposleni'
import Sifranti from './pages/Sifranti'
import { ReactNode } from 'react'
import './index.css'
import Toast from './components/Toast'
import { useToast } from './hooks/useToast'
import { createContext, useContext } from 'react'

export const ToastContext = createContext<(msg: string, type?: 'success'|'error'|'warning'|'info') => void>(() => {})
export const useToastContext = () => useContext(ToastContext)

function PrivateRoute({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.vloga !== 'admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="main-content">{children}</main>
    </>
  )
}

function AppRoutes() {
  const { user } = useAuth()
  const { toasts, toast, remove } = useToast()
  return (
  <ToastContext.Provider value={toast}>
    <Toast toasts={toasts} remove={remove} />
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/dashboard" element={
        <PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>
      } />
      <Route path="/vozila" element={
        <PrivateRoute><Layout><Vozila /></Layout></PrivateRoute>
      } />
      <Route path="/rezervacije" element={
        <PrivateRoute><Layout><Rezervacije /></Layout></PrivateRoute>
      } />
      <Route path="/servisi" element={
        <PrivateRoute><Layout><Servisi /></Layout></PrivateRoute>
      } />
      <Route path="/zaposleni" element={
        <PrivateRoute adminOnly><Layout><Zaposleni /></Layout></PrivateRoute>
      } />
      <Route path="/sifranti" element={
        <PrivateRoute adminOnly><Layout><Sifranti /></Layout></PrivateRoute>
      } />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    </ToastContext.Provider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
