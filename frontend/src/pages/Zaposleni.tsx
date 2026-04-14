import { useEffect, useState } from 'react'
import api from '../api/axios'
import Modal from '../components/Modal'
import './Page.css'
import { useToastContext } from '../App'

interface Zaposleni {
  id: number; ime: string; priimek: string; email: string; nivo: string; maxRazred: number
}
interface Nivo { id: number; naziv: string; maxRazred: number }

export default function Zaposleni() {
  const [zaposleni, setZaposleni] = useState<Zaposleni[]>([])
  const [nivoji, setNivoji] = useState<Nivo[]>([])
  const [showModal, setShowModal] = useState(false)
  const toast = useToastContext()
  const [editing, setEditing] = useState<Zaposleni | null>(null)
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ ime: '', priimek: '', email: '', geslo: '', nivoId: 0 })

  const load = () => {
    api.get('/zaposleni').then(r => setZaposleni(r.data))
    api.get('/zaposleni/nivoji').then(r => setNivoji(r.data))
  }
  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditing(null)
    setForm({ ime: '', priimek: '', email: '', geslo: '', nivoId: 0 })
    setShowModal(true)
  }

  const openEdit = (z: Zaposleni) => {
    setEditing(z)
    const nivo = nivoji.find(n => n.naziv === z.nivo)
    setForm({ ime: z.ime, priimek: z.priimek, email: z.email, geslo: '', nivoId: nivo?.id ?? 0 })
    setShowModal(true)
  }

  const handleSave = async () => {
    try {
      if (editing) {
        await api.put(`/zaposleni/${editing.id}`, {
          ime: form.ime, priimek: form.priimek, email: form.email, nivoId: form.nivoId
        })
        toast('Zaposleni posodobljen.', 'success')
      } else {
        await api.post('/zaposleni', {
          ime: form.ime, priimek: form.priimek,
          email: form.email, geslo: form.geslo, nivoId: form.nivoId
        })
        toast('Zaposleni dodan.', 'success')
      }
      setShowModal(false)
      load()
    } catch (e: any) {
      toast(e.response?.data?.message ?? 'Napaka.', 'error')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Res izbriši zaposlenega?')) return
    try {
      await api.delete(`/zaposleni/${id}`)
      toast('Zaposleni izbrisan.', 'success')
      load()
    } catch (e: any) {
      toast(e.response?.data?.message ?? 'Napaka.', 'error')
    }
  }

  const filtered = zaposleni.filter(z =>
    `${z.ime} ${z.priimek} ${z.email}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page">
      <div className="page-header">
        <h2>Zaposleni</h2>
        <div className="page-actions">
          <input placeholder="Išči..." value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn-primary" onClick={openAdd}>+ Dodaj zaposlenega</button>
        </div>
      </div>
      {msg && <div className="msg">{msg} <button onClick={() => toast('')}>✕</button></div>}
      <table className="tbl">
        <thead>
          <tr>
            <th>Ime in priimek</th><th>E-pošta</th><th>Nivo</th><th>Max razred</th><th>Akcije</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(z => (
            <tr key={z.id}>
              <td><strong>{z.ime} {z.priimek}</strong></td>
              <td>{z.email}</td>
              <td><span className="badge blue">{z.nivo}</span></td>
              <td>{z.maxRazred}</td>
              <td className="actions">
                <button className="btn-sm" onClick={() => openEdit(z)}>Uredi</button>
                <button className="btn-sm danger" onClick={() => handleDelete(z.id)}>Izbriši</button>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && <tr><td colSpan={5} className="empty">Ni zaposlenih.</td></tr>}
        </tbody>
      </table>

      {showModal && (
        <Modal title={editing ? 'Uredi zaposlenega' : 'Dodaj zaposlenega'} onClose={() => setShowModal(false)}>
          <div className="form-grid">
            <div className="field">
              <label>Ime</label>
              <input value={form.ime} onChange={e => setForm({ ...form, ime: e.target.value })} />
            </div>
            <div className="field">
              <label>Priimek</label>
              <input value={form.priimek} onChange={e => setForm({ ...form, priimek: e.target.value })} />
            </div>
            <div className="field">
              <label>E-pošta</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            {!editing && (
              <div className="field">
                <label>Geslo</label>
                <input type="password" value={form.geslo} onChange={e => setForm({ ...form, geslo: e.target.value })} />
              </div>
            )}
            <div className="field full">
              <label>Nivo</label>
              <select value={form.nivoId} onChange={e => setForm({ ...form, nivoId: +e.target.value })}>
                <option value={0}>-- Izberi --</option>
                {nivoji.map(n => <option key={n.id} value={n.id}>{n.naziv} (max razred {n.maxRazred})</option>)}
              </select>
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
