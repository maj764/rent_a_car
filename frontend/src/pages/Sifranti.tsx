import { useEffect, useState } from 'react'
import api from '../api/axios'
import Modal from '../components/Modal'
import './Page.css'
import { useToastContext } from '../App'

interface Item { id: number; ime?: string; naziv?: string; opis?: string; razred?: number; maxRazred?: number; znamkeId?: number }

type Tab = 'znamke' | 'modeli' | 'razredi' | 'nivoji'

export default function Sifranti() {
  const [tab, setTab] = useState<Tab>('znamke')
  const [items, setItems] = useState<Item[]>([])
  const [znamke, setZnamke] = useState<Item[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Item | null>(null)
  const [msg, setMsg] = useState('')
  const toast = useToastContext()
  const [form, setForm] = useState<any>({})

  const endpoints: Record<Tab, string> = {
    znamke: '/vozila/znamke',
    modeli: '/vozila/modeli',
    razredi: '/vozila/razredi',
    nivoji: '/zaposleni/nivoji'
  }

  const load = () => {
    api.get(endpoints[tab]).then(r => setItems(r.data))
    if (tab === 'modeli') api.get('/vozila/znamke').then(r => setZnamke(r.data))
  }
  useEffect(() => { load() }, [tab])

  const openAdd = () => {
    setEditing(null)
    setForm(tab === 'znamke' ? { ime: '' }
      : tab === 'modeli' ? { ime: '', znamkeId: 0 }
      : tab === 'razredi' ? { naziv: '', opis: '', razred: 1 }
      : { naziv: '', maxRazred: 1 })
    setShowModal(true)
  }

  const openEdit = (item: Item) => {
    setEditing(item)
    setForm(tab === 'znamke' ? { ime: item.ime }
      : tab === 'modeli' ? { ime: item.ime, znamkeId: item.znamkeId }
      : tab === 'razredi' ? { naziv: item.naziv, opis: item.opis, razred: item.razred }
      : { naziv: item.naziv, maxRazred: item.maxRazred })
    setShowModal(true)
  }

  const handleSave = async () => {
    const ep = endpoints[tab]
    try {
      if (editing) {
        await api.put(`${ep}/${editing.id}`, form)
      } else {
        await api.post(ep, form)
      }
      toast(editing ? 'Posodobljeno.' : 'Dodano.', 'success')
      setShowModal(false)
      load()
    } catch (e: any) {
      toast(e.response?.data?.message ?? 'Napaka.', 'error')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Res izbriši?')) return
    try {
      await api.delete(`${endpoints[tab]}/${id}`)
      toast('Izbrisano.', 'success')
      load()
    } catch (e: any) {
      toast(e.response?.data?.message ?? 'Napaka.', 'error')
    }
  }

  const label = (item: Item) => {
    if (tab === 'znamke' || tab === 'modeli') return item.ime
    return item.naziv
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'znamke', label: 'Znamke' },
    { key: 'modeli', label: 'Modeli' },
    { key: 'razredi', label: 'Razredi vozil' },
    { key: 'nivoji', label: 'Nivoji zaposlenih' },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <h2>Šifranti</h2>
        <button className="btn-primary" onClick={openAdd}>+ Dodaj</button>
      </div>
      {msg && <div className="msg">{msg} <button onClick={() => toast('')}>✕</button></div>}

      <div className="tabs">
        {tabs.map(t => (
          <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <table className="tbl">
        <thead>
          <tr>
            <th>#</th>
            <th>Naziv</th>
            {tab === 'modeli' && <th>Znamka</th>}
            {tab === 'razredi' && <th>Opis</th>}
            {tab === 'razredi' && <th>Razred</th>}
            {tab === 'nivoji' && <th>Max razred</th>}
            <th>Akcije</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td><strong>{label(item)}</strong></td>
              {tab === 'modeli' && <td>{znamke.find(z => z.id === item.znamkeId)?.ime ?? '-'}</td>}
              {tab === 'razredi' && <td>{item.opis ?? '-'}</td>}
              {tab === 'razredi' && <td><span className="badge blue">{item.razred}</span></td>}
              {tab === 'nivoji' && <td>{item.maxRazred}</td>}
              <td className="actions">
                <button className="btn-sm" onClick={() => openEdit(item)}>Uredi</button>
                <button className="btn-sm danger" onClick={() => handleDelete(item.id)}>Izbriši</button>
              </td>
            </tr>
          ))}
          {items.length === 0 && <tr><td colSpan={5} className="empty">Ni vnosov.</td></tr>}
        </tbody>
      </table>

      {showModal && (
        <Modal title={editing ? 'Uredi vnos' : 'Dodaj vnos'} onClose={() => setShowModal(false)}>
          <div className="form-grid">
            {(tab === 'znamke' || tab === 'modeli') && (
              <div className="field full">
                <label>Ime</label>
                <input value={form.ime ?? ''} onChange={e => setForm({ ...form, ime: e.target.value })} />
              </div>
            )}
            {tab === 'modeli' && (
              <div className="field full">
                <label>Znamka</label>
                <select value={form.znamkeId} onChange={e => setForm({ ...form, znamkeId: +e.target.value })}>
                  <option value={0}>-- Izberi --</option>
                  {znamke.map(z => <option key={z.id} value={z.id}>{z.ime}</option>)}
                </select>
              </div>
            )}
            {(tab === 'razredi' || tab === 'nivoji') && (
              <div className="field full">
                <label>Naziv</label>
                <input value={form.naziv ?? ''} onChange={e => setForm({ ...form, naziv: e.target.value })} />
              </div>
            )}
            {tab === 'razredi' && (
              <div className="field full">
                <label>Opis</label>
                <input value={form.opis ?? ''} onChange={e => setForm({ ...form, opis: e.target.value })} />
              </div>
            )}
            {tab === 'razredi' && (
              <div className="field full">
                <label>Razred (številka)</label>
                <input type="number" min={1} value={form.razred ?? 1}
                  onChange={e => setForm({ ...form, razred: +e.target.value })} />
              </div>
            )}
            {tab === 'nivoji' && (
              <div className="field full">
                <label>Max razred vozila</label>
                <input type="number" min={1} value={form.maxRazred ?? 1} onChange={e => setForm({ ...form, maxRazred: +e.target.value })} />
              </div>
            )}
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
