import { useEffect, useState } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import './Page.css'
import { useToastContext } from '../App'

interface Rez {
  id: number; zacetek: string; konec: string; status: string
  opis?: string; zaposleniIme: string; registrska: string; znamka: string; model: string
}
interface Vozilo { id: number; registrska: string; znamka: string; model: string }

export default function Rezervacije() {
  const { user, isAdmin } = useAuth()
  const [rezervacije, setRezervacije] = useState<Rez[]>([])
  const [vozila, setVozila] = useState<Vozilo[]>([])
  const [showModal, setShowModal] = useState(false)
  const toast = useToastContext()
  const [showZakljuciModal, setShowZakljuciModal] = useState(false)
  const [editing, setEditing] = useState<Rez | null>(null)
  const [zakljuciId, setZakljuciId] = useState<number | null>(null)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ voziloId: 0, zacetek: '', konec: '', opis: '' })
  const [kmForm, setKmForm] = useState({ zacetniKm: 0, koncniKm: 0, opombe: '' })

  const load = () => {
    const url = isAdmin ? '/rezervacije' : `/rezervacije/moje/${user?.id}`
    api.get(url).then(r => setRezervacije(r.data))
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditing(null)
    setForm({ voziloId: 0, zacetek: '', konec: '', opis: '' })
    setVozila([])
    setShowModal(true)
  }

  const loadVozilaForDatum = (zacetek: string, konec: string) => {
    if (!zacetek || !konec || !user) return
    api.get(`/vozila/na-voljo?zaposleniId=${user.id}&zacetek=${zacetek}&konec=${konec}`)
      .then(r => setVozila(r.data))
  }

  const openEdit = (r: Rez) => {
    setEditing(r)
    setForm({ voziloId: 0, zacetek: r.zacetek, konec: r.konec, opis: r.opis ?? '' })
    setShowModal(true)
  }

  const handleSave = async () => {
    try {
      if (editing) {
        await api.put(`/rezervacije/${editing.id}`, { zacetek: form.zacetek, konec: form.konec, opis: form.opis })
        toast('Rezervacija posodobljena.', 'success')
      } else {
        await api.post('/rezervacije', {
          zaposleniId: user?.id, vozilaId: form.voziloId,
          zacetek: form.zacetek, konec: form.konec, opis: form.opis
        })
        toast('Rezervacija ustvarjena.', 'success')
      }
      setShowModal(false)
      load()
    } catch (e: any) {
      toast(e.response?.data?.message ?? 'Napaka.', 'error')
    }
  }

  const handlePreklic = async (id: number) => {
    if (!confirm('Prekliči rezervacijo?')) return
    try {
      await api.put(`/rezervacije/${id}/preklic`)
      toast('Rezervacija preklicana.', 'success')
      load()
    } catch (e: any) { toast(e.response?.data?.message ?? 'Napaka.', 'error') }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Res izbriši?')) return
    try {
      await api.delete(`/rezervacije/${id}`)
      toast('Rezervacija izbrisana.', 'success')
      load()
    } catch (e: any) { toast(e.response?.data?.message ?? 'Napaka.', 'error') }
  }

  const handleZakljuci = async () => {
    if (!zakljuciId) return
    try {
      await api.put(`/rezervacije/${zakljuciId}/zakljuci`, kmForm)
      toast('Rezervacija zaključena.', 'success')
      setShowZakljuciModal(false)
      load()
    } catch (e: any) { toast(e.response?.data?.message ?? 'Napaka.', 'error') }
  }

  const statusColor: Record<string, string> = {
    aktivna: 'green', zaključena: 'blue', preklicana: 'red'
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Rezervacije</h2>
        <button className="btn-primary" onClick={openAdd}>+ Nova rezervacija</button>
      </div>
      {msg && <div className="msg">{msg} <button onClick={() => toast('')}>✕</button></div>}
      <table className="tbl">
        <thead>
          <tr>
            <th>Vozilo</th><th>Začetek</th><th>Konec</th>
            {isAdmin && <th>Zaposleni</th>}
            <th>Status</th><th>Opis</th><th>Akcije</th>
          </tr>
        </thead>
        <tbody>
          {rezervacije.map(r => (
            <tr key={r.id}>
              <td><strong>{r.registrska}</strong><br /><small>{r.znamka} {r.model}</small></td>
              <td>{r.zacetek}</td>
              <td>{r.konec}</td>
              {isAdmin && <td>{r.zaposleniIme}</td>}
              <td><span className={`badge ${statusColor[r.status]}`}>{r.status}</span></td>
              <td>{r.opis ?? '-'}</td>
              <td className="actions">
                {r.status === 'aktivna' && (
                  <>
                    <button className="btn-sm" onClick={() => openEdit(r)}>Uredi</button>
                    <button className="btn-sm" onClick={() => {
                      setZakljuciId(r.id)
                      setKmForm({ zacetniKm: 0, koncniKm: 0, opombe: '' })
                      setShowZakljuciModal(true)
                    }}>Zaključi</button>
                    <button className="btn-sm danger" onClick={() => handlePreklic(r.id)}>Prekliči</button>
                  </>
                )}
                {isAdmin && r.status !== 'aktivna' && (
                  <button className="btn-sm danger" onClick={() => handleDelete(r.id)}>Izbriši</button>
                )}
              </td>
            </tr>
          ))}
          {rezervacije.length === 0 && <tr><td colSpan={7} className="empty">Ni rezervacij.</td></tr>}
        </tbody>
      </table>

      {showModal && (
        <Modal title={editing ? 'Uredi rezervacijo' : 'Nova rezervacija'} onClose={() => setShowModal(false)}>
          <div className="form-grid">
            <div className="field">
              <label>Začetek</label>
              <input type="date" value={form.zacetek} onChange={e => {
                setForm({ ...form, zacetek: e.target.value })
                loadVozilaForDatum(e.target.value, form.konec)
              }} />
            </div>
            <div className="field">
              <label>Konec</label>
              <input type="date" value={form.konec} onChange={e => {
                setForm({ ...form, konec: e.target.value })
                loadVozilaForDatum(form.zacetek, e.target.value)
              }} />
            </div>
            {!editing && (
              <div className="field full">
                <label>Vozilo</label>
                <select value={form.voziloId} onChange={e => setForm({ ...form, voziloId: +e.target.value })}>
                  <option value={0}>-- Izberi --</option>
                  {vozila.map(v => (
                    <option key={v.id} value={v.id}>{v.registrska} — {v.znamka} {v.model}</option>
                  ))}
                </select>
                {vozila.length === 0 && form.zacetek && form.konec && (
                  <small style={{ color: 'var(--danger)' }}>Ni razpoložljivih vozil za ta termin.</small>
                )}
              </div>
            )}
            <div className="field full">
              <label>Opis</label>
              <input value={form.opis} onChange={e => setForm({ ...form, opis: e.target.value })} placeholder="Npr. Službena pot Ljubljana" />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Prekliči</button>
            <button className="btn-primary" onClick={handleSave}>Shrani</button>
          </div>
        </Modal>
      )}

      {showZakljuciModal && (
        <Modal title="Zaključi rezervacijo — vpiši km" onClose={() => setShowZakljuciModal(false)}>
          <div className="form-grid">
            <div className="field">
              <label>Začetni km</label>
              <input type="number" value={kmForm.zacetniKm} onChange={e => setKmForm({ ...kmForm, zacetniKm: +e.target.value })} />
            </div>
            <div className="field">
              <label>Končni km</label>
              <input type="number" value={kmForm.koncniKm} onChange={e => setKmForm({ ...kmForm, koncniKm: +e.target.value })} />
            </div>
            <div className="field full">
              <label>Opombe</label>
              <input value={kmForm.opombe} onChange={e => setKmForm({ ...kmForm, opombe: e.target.value })} />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn-secondary" onClick={() => setShowZakljuciModal(false)}>Prekliči</button>
            <button className="btn-primary" onClick={handleZakljuci}>Zaključi</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
