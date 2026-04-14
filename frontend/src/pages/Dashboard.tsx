import { useEffect, useState, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import './Dashboard.css'
import { useToastContext } from '../App'

Chart.register(...registerables)

interface Stat {
  skupajVozil: number; naVoljo: number; vNajemu: number
  vServisu: number; aktivneRezervacije: number; skupajKmVsehVozil: number
}
interface DashboardData {
  kmPoVozilih: { registrska: string; naziv: string; km: number }[]
  rezervacijePoMesecih: { mesec: string; stevilo: number }[]
  statusVozil: { naVoljo: number; vNajemu: number; vServisu: number }
  topZaposleni: { ime: string; stevilo: number }[]
}

export default function Dashboard() {
  const { user, isAdmin } = useAuth()
  const [stat, setStat] = useState<Stat | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)

  const kmChart = useRef<Chart | null>(null)
  const rezChart = useRef<Chart | null>(null)
  const statusChart = useRef<Chart | null>(null)
  const toast = useToastContext()
  const topChart = useRef<Chart | null>(null)

  const kmRef = useRef<HTMLCanvasElement>(null)
  const rezRef = useRef<HTMLCanvasElement>(null)
  const statusRef = useRef<HTMLCanvasElement>(null)
  const topRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!isAdmin) return
    api.get('/statistika').then(r => setStat(r.data))
    api.get('/statistika/dashboard').then(r => setData(r.data))
  }, [isAdmin])

  useEffect(() => {
    if (!data) return

    // Km po vozilih
    if (kmRef.current) {
      kmChart.current?.destroy()
      kmChart.current = new Chart(kmRef.current, {
        type: 'bar',
        data: {
          labels: data.kmPoVozilih.map(v => v.registrska),
          datasets: [{
            label: 'Kilometri',
            data: data.kmPoVozilih.map(v => v.km),
            backgroundColor: '#378ADD',
            borderRadius: 6,
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
            x: { grid: { display: false } }
          }
        }
      })
    }

    // Rezervacije po mesecih
    if (rezRef.current) {
      rezChart.current?.destroy()
      rezChart.current = new Chart(rezRef.current, {
        type: 'line',
        data: {
          labels: data.rezervacijePoMesecih.map(r => r.mesec),
          datasets: [{
            label: 'Rezervacije',
            data: data.rezervacijePoMesecih.map(r => r.stevilo),
            borderColor: '#7F77DD',
            backgroundColor: 'rgba(127,119,221,0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#7F77DD',
            pointRadius: 4,
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.05)' } },
            x: { grid: { display: false } }
          }
        }
      })
    }

    // Status vozil — donut
    if (statusRef.current) {
      statusChart.current?.destroy()
      statusChart.current = new Chart(statusRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Na voljo', 'V najemu', 'V servisu'],
          datasets: [{
            data: [data.statusVozil.naVoljo, data.statusVozil.vNajemu, data.statusVozil.vServisu],
            backgroundColor: ['#1D9E75', '#BA7517', '#E24B4A'],
            borderWidth: 0,
          }]
        },
        options: {
          responsive: true,
          cutout: '70%',
          plugins: {
            legend: { position: 'bottom', labels: { padding: 16, font: { size: 13 } } }
          }
        }
      })
    }

    // Top zaposleni
    if (topRef.current && data.topZaposleni.length > 0) {
      topChart.current?.destroy()
      topChart.current = new Chart(topRef.current, {
        type: 'bar',
        data: {
          labels: data.topZaposleni.map(z => z.ime),
          datasets: [{
            label: 'Rezervacije',
            data: data.topZaposleni.map(z => z.stevilo),
            backgroundColor: '#1D9E75',
            borderRadius: 6,
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.05)' } },
            y: { grid: { display: false } }
          }
        }
      })
    }

    return () => {
      kmChart.current?.destroy()
      rezChart.current?.destroy()
      statusChart.current?.destroy()
      topChart.current?.destroy()
    }
  }, [data])

  return (
    <div className="page">
      <h2 style={{ marginBottom: '20px' }}>Dobrodošel, {user?.ime}! 👋</h2>

      {isAdmin && stat && (
        <>
          <div className="stat-grid">
            <div className="stat-card" style={{ borderTopColor: '#378ADD' }}>
              <div className="stat-card-header">
                <span className="stat-label">SKUPAJ VOZIL</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#378ADD" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              </div>
              <div className="stat-num">{stat.skupajVozil}</div>
            </div>
            <div className="stat-card" style={{ borderTopColor: '#1D9E75' }}>
              <div className="stat-card-header">
                <span className="stat-label">NA VOLJO</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <div className="stat-num">{stat.naVoljo}</div>
            </div>
            <div className="stat-card" style={{ borderTopColor: '#BA7517' }}>
              <div className="stat-card-header">
                <span className="stat-label">V NAJEMU</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div className="stat-num">{stat.vNajemu}</div>
            </div>
            <div className="stat-card" style={{ borderTopColor: '#E24B4A' }}>
              <div className="stat-card-header">
                <span className="stat-label">V SERVISU</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E24B4A" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              </div>
              <div className="stat-num">{stat.vServisu}</div>
            </div>
            <div className="stat-card" style={{ borderTopColor: '#7F77DD' }}>
              <div className="stat-card-header">
                <span className="stat-label">AKTIVNE REZ.</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7F77DD" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div className="stat-num">{stat.aktivneRezervacije}</div>
            </div>
            <div className="stat-card" style={{ borderTopColor: '#888780' }}>
              <div className="stat-card-header">
                <span className="stat-label">SKUPAJ KM</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888780" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              </div>
              <div className="stat-num">{stat.skupajKmVsehVozil.toLocaleString()}</div>
            </div>
          </div>

          {data && (
            <div className="charts-grid">
              <div className="chart-card wide">
                <h3>Kilometri po vozilih</h3>
                <canvas ref={kmRef} />
              </div>
              <div className="chart-card">
                <h3>Status vozil</h3>
                <canvas ref={statusRef} />
              </div>
              <div className="chart-card wide">
                <h3>Rezervacije {new Date().getFullYear()}</h3>
                <canvas ref={rezRef} />
              </div>
              <div className="chart-card">
                <h3>Top zaposleni</h3>
                {data.topZaposleni.length === 0
                  ? <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '20px' }}>Še ni rezervacij.</p>
                  : <canvas ref={topRef} />}
              </div>
            </div>
          )}
        </>
      )}

      {!isAdmin && (
        <p className="info-box">Pojdi na <strong>Rezervacije</strong> za pregled in ustvarjanje rezervacij.</p>
      )}
    </div>
  )
}