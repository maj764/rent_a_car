import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import './Login.css'
import { useToastContext } from '../App'

export default function Login() {
  const [email, setEmail] = useState('')
  const [geslo, setGeslo] = useState('')
  const [error, setError] = useState('')
  const toast = useToastContext()
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email, geslo })
      const d = res.data
      login(d.token, { id: d.id, ime: d.ime, priimek: d.priimek, email: d.email, vloga: d.vloga })
      navigate('/dashboard')
    } catch {
      setError('Napačen e-mail ali geslo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">🚗</div>
        <h1>RentACar</h1>
        <p className="login-sub">Sistem za upravljanje voznega parka</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>E-pošta</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label>Geslo</label>
            <input type="password" value={geslo} onChange={e => setGeslo(e.target.value)} required />
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Prijavljam...' : 'Prijava'}
          </button>
        </form>
      </div>
    </div>
  )
}
