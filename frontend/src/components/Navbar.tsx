import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'
import api from '../api/axios'
import './Navbar.css'
import { useToastContext } from '../App'

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [showGeslo, setShowGeslo] = useState(false)
  const [form, setForm] = useState({ staroGeslo: '', novoGeslo: '', ponovitev: '' })
  const toast = useToastContext()

  const handleLogout = () => { logout(); navigate('/login') }

  const handleSpremenGeslo = async () => {
    if (form.novoGeslo !== form.ponovitev) {
      toast('Novi gesli se ne ujemata!', 'error'); return
    }
    if (form.novoGeslo.length < 6) {
      toast('Geslo mora imeti vsaj 6 znakov!', 'error'); return
    }
    try {
      await api.put(`/zaposleni/${user?.id}/geslo`, {
        staroGeslo: form.staroGeslo,
        novoGeslo: form.novoGeslo
      })
      toast('Geslo uspešno spremenjeno.', 'success')
      setForm({ staroGeslo: '', novoGeslo: '', ponovitev: '' })
      setTimeout(() => { setShowGeslo(false); }, 1500)
    } catch (e: any) {
      toast(e.response?.data?.message ?? 'Napaka.', 'error')
    }
  }

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand">🚗 RentACar</div>
        <div className="navbar-links">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/vozila">Vozila</NavLink>
          <NavLink to="/rezervacije">Rezervacije</NavLink>
          <NavLink to="/servisi">Servisi</NavLink>
          {isAdmin && <NavLink to="/zaposleni">Zaposleni</NavLink>}
          {isAdmin && <NavLink to="/sifranti">Šifranti</NavLink>}
        </div>
        <div className="navbar-user">
          <span>{user?.ime} {user?.priimek}</span>
          <span className={`badge ${user?.vloga}`}>{user?.vloga}</span>
          <button className="btn-geslo" onClick={() => setShowGeslo(true)}>🔑</button>
          <button onClick={handleLogout}>Odjava</button>
        </div>
      </nav>

      {showGeslo && (
        <div className="geslo-overlay" onClick={e => { if (e.target === e.currentTarget) setShowGeslo(false) }}>
          <div className="geslo-modal">
            <div className="geslo-header">
              <h3>Spremeni geslo</h3>
              <button onClick={() => setShowGeslo(false)}>✕</button>
            </div>
            <div className="geslo-body">
              <div className="field">
                <label>Staro geslo</label>
                <input type="password" value={form.staroGeslo}
                  onChange={e => setForm({ ...form, staroGeslo: e.target.value })} />
              </div>
              <div className="field">
                <label>Novo geslo</label>
                <input type="password" value={form.novoGeslo}
                  onChange={e => setForm({ ...form, novoGeslo: e.target.value })} />
              </div>
              <div className="field">
                <label>Ponovi novo geslo</label>
                <input type="password" value={form.ponovitev}
                  onChange={e => setForm({ ...form, ponovitev: e.target.value })} />
              </div>
            </div>
            <div className="geslo-footer">
              <button className="btn-secondary" onClick={() => setShowGeslo(false)}>Prekliči</button>
              <button className="btn-primary" onClick={handleSpremenGeslo}>Shrani</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}