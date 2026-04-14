import { useEffect, useState } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import './Page.css'
import { useToastContext } from '../App'

interface Vozilo {
  id: number; registrska: string; letnik: number; km: number
  status: string; znamka: string; model: string; razred: string; opis?: string
}
interface Znamka { id: number; ime: string }
interface ModelT { id: number; ime: string; znamkeId: number }
interface Razred { id: number; naziv: string }

const STATUSI = ['na voljo', 'v najemu', 'v servisu']

export default function Vozila() {
  const { isAdmin } = useAuth()
  const toast = useToastContext()
  const [vozila, setVozila] = useState<Vozilo[]>([])
  const [znamke, setZnamke] = useState<Znamka[]>([])
  const [modeli, setModeli] = useState<ModelT[]>([])
  const [razredi, setRazredi] = useState<Razred[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Vozilo | null>(null)
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState('')

  const [form, setForm] = useState({
    registrska: '', letnik: new Date().getFullYear(), km: 0,
    modeliId: 0, razredId: 0, opis: '', status: 'na voljo', znamkaId: 0
  })

  const load = () => {
    api.get('/vozila').then(r => setVozila(r.data))
    api.get('/vozila/znamke').then(r => setZnamke(r.data))
    api.get('/vozila/razredi').then(r => setRazredi(r.data))
  }
  useEffect(() => { load() }, [])

  const loadModeli = (znamkaId: number) => {
    if (!znamkaId) return
    api.get(`/vozila/modeli?znamkaId=${znamkaId}`).then(r => setModeli(r.data))
  }

  const openAdd = () => {
    setEditing(null)
    setForm({ registrska: '', letnik: new Date().getFullYear(), km: 0, modeliId: 0, razredId: 0, opis: '', status: 'na voljo', znamkaId: 0 })
    setModeli([])
    setShowModal(true)
  }

  const openEdit = (v: Vozilo) => {
    setEditing(v)
    const znamka = znamke.find(z => z.ime === v.znamka)
    const znamkaId = znamka?.id ?? 0
    if (znamkaId) api.get(`/vozila/modeli?znamkaId=${znamkaId}`).then(r => {
      setModeli(r.data)
      const m = r.data.find((x: ModelT) => x.ime === v.model)
      const rz = razredi.find(x => x.naziv === v.razred)
      setForm({ registrska: v.registrska, letnik: v.letnik, km: v.km, modeliId: m?.id ?? 0, razredId: rz?.id ?? 0, opis: v.opis ?? '', status: v.status, znamkaId })
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    try {
      if (editing) {
        await api.put(`/vozila/${editing.id}`, {
          registrska: form.registrska, letnik: form.letnik, km: form.km,
          modeliId: form.modeliId, razredId: form.razredId, opis: form.opis, status: form.status
        })
        toast('Vozilo posodobljeno.', 'success')
      } else {
        await api.post('/vozila', {
          registrska: form.registrska, letnik: form.letnik, km: form.km,
          modeliId: form.modeliId, razredId: form.razredId, opis: form.opis
        })
        toast('Vozilo dodano.', 'success')
      }
      setShowModal(false)
      load()
    } catch (e: any) {
      toast(e.response?.data?.message ?? 'Napaka.', 'error')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Res izbriši vozilo?')) return
    try {
      await api.delete(`/vozila/${id}`)
      toast('Vozilo izbrisano.', 'success')
      load()
    } catch (e: any) {
      toast(e.response?.data?.message ?? 'Napaka.', 'error')
    }
  }

  const filtered = vozila.filter(v =>
    v.registrska.toLowerCase().includes(search.toLowerCase()) ||
    v.znamka.toLowerCase().includes(search.toLowerCase()) ||
    v.model.toLowerCase().includes(search.toLowerCase())
  )

  const statusColor: Record<string, string> = {
    'na voljo': 'green', 'v najemu': 'orange', 'v servisu': 'red'
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Vozila</h2>
        <div className="page-actions">
          <input placeholder="Išči..." value={search} onChange={e => setSearch(e.target.value)} />
          {isAdmin && <button className="btn-primary" onClick={openAdd}>+ Dodaj vozilo</button>}
        </div>
      </div>
      {msg && <div className="msg">{msg} <button onClick={() => toast('')}>✕</button></div>}
      <table className="tbl">
        <thead>
          <tr>
            <th>Registrska</th><th>Znamka</th><th>Model</th>
            <th>Letnik</th><th>Km</th><th>Razred</th><th>Status</th>
            {isAdmin && <th>Akcije</th>}
          </tr>
        </thead>
        <tbody>
          {filtered.map(v => (
            <tr key={v.id}>
              <td><strong>{v.registrska}</strong></td>
              <td>{v.znamka}</td>
              <td>{v.model}</td>
              <td>{v.letnik}</td>
              <td>{v.km.toLocaleString()} km</td>
              <td>{v.razred}</td>
              <td><span className={`badge ${statusColor[v.status]}`}>{v.status}</span></td>
              {isAdmin && (
                <td className="actions">
                  <button className="btn-sm" onClick={() => openEdit(v)}>Uredi</button>
                  <button className="btn-sm danger" onClick={() => handleDelete(v.id)}>Izbriši</button>
                </td>
              )}
            </tr>
          ))}
          {filtered.length === 0 && <tr><td colSpan={8} className="empty">Ni vozil.</td></tr>}
        </tbody>
      </table>

      {showModal && (
        <Modal title={editing ? 'Uredi vozilo' : 'Dodaj vozilo'} onClose={() => setShowModal(false)}>
          <div className="form-grid">
            <div className="field">
              <label>Registrska</label>
              <input value={form.registrska} onChange={e => setForm({ ...form, registrska: e.target.value })} />
            </div>
            <div className="field">
              <label>Letnik</label>
              <input type="number" value={form.letnik} onChange={e => setForm({ ...form, letnik: +e.target.value })} />
            </div>
            <div className="field">
              <label>Km</label>
              <input type="number" value={form.km} onChange={e => setForm({ ...form, km: +e.target.value })} />
            </div>
            <div className="field">
              <label>Znamka</label>
              <select value={form.znamkaId} onChange={e => {
                const id = +e.target.value
                setForm({ ...form, znamkaId: id, modeliId: 0 })
                loadModeli(id)
              }}>
                <option value={0}>-- Izberi --</option>
                {znamke.map(z => <option key={z.id} value={z.id}>{z.ime}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Model</label>
              <select value={form.modeliId} onChange={e => setForm({ ...form, modeliId: +e.target.value })}>
                <option value={0}>-- Izberi --</option>
                {modeli.map(m => <option key={m.id} value={m.id}>{m.ime}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Razred</label>
              <select value={form.razredId} onChange={e => setForm({ ...form, razredId: +e.target.value })}>
                <option value={0}>-- Izberi --</option>
                {razredi.map(r => <option key={r.id} value={r.id}>{r.naziv}</option>)}
              </select>
            </div>
            {editing && (
              <div className="field">
                <label>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {STATUSI.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            <div className="field full">
              <label>Opis</label>
              <input value={form.opis} onChange={e => setForm({ ...form, opis: e.target.value })} />
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
