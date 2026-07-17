import { useState, useEffect, useRef } from 'react'
import './App.css'

const API = import.meta.env.VITE_API_URL || ''

function fmtViews(n) {
  if (!n) return null
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M vues`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K vues`
  return `${n} vues`
}

function fmtBytes(b) {
  if (!b) return null
  if (b >= 1024 ** 3) return `${(b / 1024 ** 3).toFixed(1)} GB`
  if (b >= 1024 ** 2) return `${(b / 1024 ** 2).toFixed(0)} MB`
  return `${(b / 1024).toFixed(0)} KB`
}

const Icon = {
  Link: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  ),
  Video: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
  ),
  Music: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
    </svg>
  ),
  Download: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  Check: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Alert: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  Clock: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Eye: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  Star: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
}

function Spinner({ size = 20 }) {
  return (
    <svg className="spinner" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.15"/>
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
    </svg>
  )
}

function UrlInput({ onAnalyze, loading }) {
  const [url, setUrl] = useState('')
  const inputRef = useRef()

  function handleSubmit(e) {
    e.preventDefault()
    if (url.trim()) onAnalyze(url.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="url-form">
      <div className="url-input-wrap">
        <span className="url-icon"><Icon.Link /></span>
        <input
          ref={inputRef}
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="Collez une URL YouTube, Vimeo, SoundCloud…"
          className="url-input"
          disabled={loading}
          autoFocus
        />
        {url && !loading && (
          <button type="button" className="url-clear" onClick={() => setUrl('')}>×</button>
        )}
      </div>
      <button type="submit" className="btn-analyze" disabled={!url.trim() || loading}>
        {loading ? <Spinner size={18} /> : <><Icon.Download /> Analyser</>}
      </button>
    </form>
  )
}

function MediaMeta({ info }) {
  return (
    <div className="meta-card">
      {info.thumbnail && (
        <div className="meta-thumb">
          <img src={info.thumbnail} alt={info.title} />
          {info.duration && <span className="meta-duration">{info.duration}</span>}
        </div>
      )}
      <div className="meta-body">
        <span className="meta-platform">{info.platform}</span>
        <h2 className="meta-title">{info.title}</h2>
        <div className="meta-stats">
          {info.uploader && <span className="meta-uploader">{info.uploader}</span>}
          {info.duration && <span className="meta-stat"><Icon.Clock /> {info.duration}</span>}
          {info.view_count && <span className="meta-stat"><Icon.Eye /> {fmtViews(info.view_count)}</span>}
        </div>
      </div>
    </div>
  )
}

function FormatPicker({ formats, selected, onSelect }) {
  const videos = formats.filter(f => f.type === 'video')
  const audios = formats.filter(f => f.type === 'audio')
  return (
    <div className="format-picker">
      {videos.length > 0 && (
        <div className="format-group">
          <p className="format-group-label"><Icon.Video /> Vidéo</p>
          <div className="format-grid">
            {videos.map(f => (
              <button
                key={f.id + f.label}
                className={`format-btn ${selected?.id === f.id && selected?.label === f.label ? 'active' : ''}`}
                onClick={() => onSelect(f)}
              >
                <span className="format-res">{f.label}</span>
                {f.ext && <span className="format-ext">{f.ext.toUpperCase()}</span>}
                {f.filesize && <span className="format-size">{fmtBytes(f.filesize)}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
      {audios.length > 0 && (
        <div className="format-group">
          <p className="format-group-label"><Icon.Music /> Audio uniquement</p>
          <div className="format-grid">
            {audios.map(f => (
              <button
                key={f.id + f.label}
                className={`format-btn ${selected?.id === f.id && selected?.label === f.label ? 'active' : ''}`}
                onClick={() => onSelect(f)}
              >
                <span className="format-res">{f.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ProgressBar({ value, label, sublabel }) {
  return (
    <div className="progress-wrap">
      <div className="progress-header">
        <span className="progress-label">{label}</span>
        <span className="progress-pct">{value}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${value}%` }}>
          <span className="progress-sweep" />
        </div>
      </div>
      {sublabel && <p className="progress-sub">{sublabel}</p>}
    </div>
  )
}

function ErrorBanner({ message, onDismiss }) {
  return (
    <div className="error-banner">
      <Icon.Alert />
      <span>{message}</span>
      <button onClick={onDismiss} className="error-dismiss">×</button>
    </div>
  )
}

export default function App() {
  const [phase, setPhase] = useState('idle')
  const [mediaInfo, setMediaInfo] = useState(null)
  const [selectedFormat, setSelectedFormat] = useState(null)
  const [jobId, setJobId] = useState(null)
  const [jobStatus, setJobStatus] = useState(null)
  const [error, setError] = useState(null)
  const [currentUrl, setCurrentUrl] = useState('')
  const pollRef = useRef(null)

  useEffect(() => {
    if (!jobId || phase !== 'downloading') return
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/job/${jobId}`)
        const data = await res.json()
        setJobStatus(data)
        if (data.status === 'done') { setPhase('done'); clearInterval(pollRef.current) }
        else if (data.status === 'error') { setError(data.error || 'Erreur'); setPhase('error'); clearInterval(pollRef.current) }
      } catch {}
    }, 800)
    return () => clearInterval(pollRef.current)
  }, [jobId, phase])

  async function handleAnalyze(url) {
    setCurrentUrl(url); setPhase('analyzing'); setError(null)
    setMediaInfo(null); setSelectedFormat(null); setJobStatus(null); setJobId(null)
    try {
      const res = await fetch(`${API}/api/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Impossible d\'analyser') }
      const info = await res.json()
      setMediaInfo(info); setSelectedFormat(info.formats[0] || null); setPhase('ready')
    } catch (e) { setError(e.message); setPhase('error') }
  }

  async function handleDownload() {
    if (!selectedFormat) return
    setPhase('downloading'); setError(null)
    const isAudio = selectedFormat.type === 'audio'
    try {
      const res = await fetch(`${API}/api/download`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: currentUrl, format_id: selectedFormat.id, audio_only: isAudio, audio_format: selectedFormat.ext || 'mp3' }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Erreur') }
      const { job_id } = await res.json()
      setJobId(job_id); setJobStatus({ status: 'queued', progress: 0 })
    } catch (e) { setError(e.message); setPhase('error') }
  }

  function reset() {
    setPhase('idle'); setMediaInfo(null); setSelectedFormat(null)
    setJobId(null); setJobStatus(null); setError(null); setCurrentUrl('')
    clearInterval(pollRef.current)
  }

  const progressLabel = () => {
    if (!jobStatus) return 'Démarrage…'
    if (jobStatus.status === 'queued') return 'En attente…'
    if (jobStatus.status === 'downloading') return 'Téléchargement en cours…'
    return 'Finalisation…'
  }

  const progressSublabel = () => {
    if (!jobStatus) return null
    const parts = []
    if (jobStatus.speed) parts.push(jobStatus.speed)
    if (jobStatus.eta) parts.push(`ETA ${jobStatus.eta}`)
    return parts.join('  ·  ') || null
  }

  return (
    <div className="app">
      {/* Animated background */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />
      <div className="bg-noise" />

      {/* Header */}
      <header className="header">
        {/* Author signature — top right */}
        <div className="author-tag">
          <div className="author-initials">RF</div>
          <div className="author-details">
            <span className="author-by">Créé par</span>
            <span className="author-name">Randrianera Fifaliana</span>
          </div>
        </div>

        {/* Logo */}
        <div className="logo-wrap">
          <div className="logo-icon-wrap">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </div>
          <div>
            <h1 className="logo-text">Media<span className="logo-accent">Down</span></h1>
            <p className="logo-sub">Téléchargeur de vidéos &amp; audio</p>
          </div>
        </div>

        <p className="tagline">
          Téléchargez depuis <strong>YouTube</strong>, <strong>Vimeo</strong>, <strong>SoundCloud</strong> et 1000+ plateformes
        </p>

        {/* Stats bar */}
        <div className="stats-bar">
          <div className="stat-item"><Icon.Star /><span>1000+ sites</span></div>
          <div className="stat-divider" />
          <div className="stat-item"><Icon.Video /><span>HD &amp; 4K</span></div>
          <div className="stat-divider" />
          <div className="stat-item"><Icon.Music /><span>MP3 / M4A</span></div>
        </div>
      </header>

      <main className="main">
        {/* URL Input */}
        {phase !== 'downloading' && phase !== 'done' && (
          <div className="input-section">
            <UrlInput onAnalyze={handleAnalyze} loading={phase === 'analyzing'} />
          </div>
        )}

        {/* Scanning */}
        {phase === 'analyzing' && (
          <div className="scan-card">
            <div className="scan-icon"><Spinner size={32} /></div>
            <p className="scan-title">Analyse en cours…</p>
            <p className="scan-sub">Récupération des métadonnées et formats disponibles</p>
            <div className="scan-bar"><div className="scan-sweep" /></div>
          </div>
        )}

        {/* Error */}
        {error && (
          <ErrorBanner message={error} onDismiss={() => { setError(null); if (phase === 'error') setPhase('idle') }} />
        )}

        {/* Result */}
        {(phase === 'ready' || phase === 'downloading' || phase === 'done') && mediaInfo && (
          <div className="result-panel">
            <MediaMeta info={mediaInfo} />

            {phase === 'ready' && (
              <>
                <FormatPicker formats={mediaInfo.formats} selected={selectedFormat} onSelect={setSelectedFormat} />
                <div className="action-row">
                  <button className="btn-secondary" onClick={reset}>← Nouvelle URL</button>
                  <button className="btn-download" onClick={handleDownload} disabled={!selectedFormat}>
                    <Icon.Download />
                    Télécharger {selectedFormat?.label}
                  </button>
                </div>
              </>
            )}

            {phase === 'downloading' && (
              <div className="download-state">
                <ProgressBar value={jobStatus?.progress ?? 0} label={progressLabel()} sublabel={progressSublabel()} />
              </div>
            )}

            {phase === 'done' && (
              <div className="done-state">
                <div className="done-circle">
                  <div className="done-icon"><Icon.Check /></div>
                </div>
                <p className="done-title">Téléchargement terminé !</p>
                <p className="done-sub">Votre fichier est prêt à être sauvegardé.</p>
                <div className="action-row">
                  <button className="btn-secondary" onClick={reset}>← Nouvelle URL</button>
                  <button className="btn-download" onClick={() => window.open(`${API}/api/download/${jobId}`, '_blank')}>
                    <Icon.Download /> Sauvegarder le fichier
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Platforms */}
        {phase === 'idle' && (
          <div className="platforms-section">
            <p className="platforms-label">✦ Plateformes supportées ✦</p>
            <div className="platforms-grid">
              {['YouTube', 'Vimeo', 'SoundCloud', 'Dailymotion', 'Twitch', 'Bandcamp', 'Twitter / X', 'TikTok', 'Instagram', '1000+ autres'].map(p => (
                <span key={p} className="platform-chip">{p}</span>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-brand">
          <span className="footer-logo">MediaDown</span>
        </div>
        <div className="footer-author-block">
          <div className="footer-avatar">RF</div>
          <div>
            <p className="footer-made">Conçu &amp; développé avec ♥ par</p>
            <p className="footer-name">Randrianera Fifaliana</p>
          </div>
        </div>
        <p className="footer-tech">Propulsé par <code>yt-dlp</code> · <code>FastAPI</code> · <code>React</code></p>
      </footer>
    </div>
  )
}
