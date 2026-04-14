import { useEffect, useState } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import './Page.css'
import { useToastContext } from '../App'

interface Servis {
  id: number; datum: string; tip: string; opis?: string
  cena: number; registrska: string; znamka: string; model: string; vozilaId: number
}
interface Vozilo { id: number; registrska: string; znamka: string; model: string; status: string }

export default function Servisi() {
  const { isAdmin } = useAuth()
  const [servisi, setServisi] = useState<Servis[]>([])
  const [vozila, setVozila] = useState<Vozilo[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Servis | null>(null)
  const [msg, setMsg] = useState('')
  const toast = useToastContext()
  const [form, setForm] = useState({
    vozilaId: 0, datum: new Date().toISOString().split('T')[0],
    tip: '', opis: '', cena: 0
  })

  const load = () => {
    api.get('/servisi').then(r => setServisi(r.data))
    api.get('/vozila').then(r => setVozila(r.data))
  }
  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditing(null)
    setForm({ vozilaId: 0, datum: new Date().toISOString().split('T')[0], tip: '', opis: '', cena: 0 })
    setShowModal(true)
  }

  const openEdit = (s: Servis) => {
    setEditing(s)
    setForm({ vozilaId: s.vozilaId, datum: s.datum, tip: s.tip, opis: s.opis ?? '', cena: s.cena })
    setShowModal(true)
  }

  const handleSave = async () => {
    try {
      if (editing) {
        await api.put(`/servisi/${editing.id}`, {
          datum: form.datum, tip: form.tip, opis: form.opis, cena: form.cena
        })
        toast('Servis posodobljen.', 'success')
      } else {
        await api.post('/servisi', {
          vozilaId: form.vozilaId, datum: form.datum,
          tip: form.tip, opis: form.opis, cena: form.cena
        })
        toast('Servis dodan.', 'success')
      }
      setShowModal(false)
      load()
    } catch (e: any) {
      toast(e.response?.data?.message ?? 'Napaka.', 'error')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Res izbriši servis?')) return
    try {
      await api.delete(`/servisi/${id}`)
      toast('Servis izbrisan.', 'success')
      load()
    } catch (e: any) {
      toast(e.response?.data?.message ?? 'Napaka.', 'error')
    }
  }

  const handleZakljuci = async (vozilaId: number) => {
    if (!confirm('Zaključi servis in vrni vozilo v promet?')) return
    try {
      await api.put(`/servisi/vozilo/${vozilaId}/zakljuci`)
      toast('Vozilo vrnjeno v promet.', 'success')
      load()
    } catch (e: any) {
      toast(e.response?.data?.message ?? 'Napaka.', 'error')
    }
  }

  const TIPI = ['redno vzdrževanje', 'popravilo', 'tehnični pregled', 'menjava gum', 'drugo']

  return (
    <div className="page">
      <div className="page-header">
        <h2>Servisi</h2>
        {isAdmin && <button className="btn-primary" onClick={openAdd}>+ Dodaj servis</button>}
      </div>
      {msg && <div className="msg">{msg} <button onClick={() => toast('')}>✕</button></div>}
      <table className="tbl">
        <thead>
          <tr>
            <th>Vozilo</th><th>Datum</th><th>Tip</th><th>Opis</th><th>Cena</th>
            {isAdmin && <th>Akcije</th>}
          </tr>
        </thead>
        <tbody>
          {servisi.map(s => (
            <tr key={s.id}>
              <td>
                <strong>{s.registrska}</strong>
                <br /><small>{s.znamka} {s.model}</small>
              </td>
              <td>{s.datum}</td>
              <td><span className="badge gray">{s.tip}</span></td>
              <td>{s.opis ?? '-'}</td>
              <td>{s.cena.toFixed(2)} €</td>
              {isAdmin && (
                <td className="actions">
                  <button className="btn-sm" onClick={() => openEdit(s)}>Uredi</button>
                  {vozila.find(v => v.id === s.vozilaId)?.status === 'v servisu' && (
                    <button className="btn-sm green" onClick={() => handleZakljuci(s.vozilaId)}>
                      Zaključi servis
                    </button>
                  )}
                  <button className="btn-sm danger" onClick={() => handleDelete(s.id)}>Izbriši</button>
                </td>
              )}
            </tr>
          ))}
          {servisi.length === 0 && <tr><td colSpan={6} className="empty">Ni servisov.</td></tr>}
        </tbody>
      </table>

      {showModal && (
        <Modal title={editing ? 'Uredi servis' : 'Dodaj servis'} onClose={() => setShowModal(false)}>
          <div className="form-grid">
            {!editing && (
              <div className="field full">
                <label>Vozilo</label>
                <select value={form.vozilaId} onChange={e => setForm({ ...form, vozilaId: +e.target.value })}>
                  <option value={0}>-- Izberi --</option>
                  {vozila.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.registrska} — {v.znamka} {v.model} ({v.status})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="field">
              <label>Datum</label>
              <input type="date" value={form.datum} onChange={e => setForm({ ...form, datum: e.target.value })} />
            </div>
            <div className="field">
              <label>Tip</label>
              <select value={form.tip} onChange={e => setForm({ ...form, tip: e.target.value })}>
                <option value="">-- Izberi --</option>
                {TIPI.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Cena (€)</label>
              <input type="number" step="0.01" value={form.cena} onChange={e => setForm({ ...form, cena: +e.target.value })} />
            </div>
            <div className="field full">
              <label>Opis</label>
              <input value={form.opis} onChange={e => setForm({ ...form, opis: e.target.value })} placeholder="Npr. Menjava olja in filtrov" />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Prekliči</button>
            <button className="btn-primary" onClick={handleSave}>Shrani</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
