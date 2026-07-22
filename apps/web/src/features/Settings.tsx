import { Check, Download, RefreshCw, Share2, ShieldCheck, Wifi, WifiOff, MessageSquare } from 'lucide-react'
import { usePwa } from '../lib/pwa/PwaProvider'
import { FeedbackForm } from '../components/FeedbackForm'
import { BuildIdentity } from '../components/BuildIdentity'

export function Settings() {
  const {
    canInstall,
    isInstalled,
    isIos,
    isOnline,
    serviceWorkerState,
    updateAvailable,
    install,
    applyUpdate,
  } = usePwa()

  return (
    <section className="page">
      <header className="page-heading desktop-only-heading">
        <span className="eyebrow">App and privacy</span>
        <h1>More</h1>
      </header>

      <section className="settings-section" aria-labelledby="install-title">
        <div className="section-heading">
          <div className="section-icon"><Download size={20} /></div>
          <div><h2 id="install-title">Install TT Learn</h2><p>Faster access and native share capture where your platform supports it.</p></div>
        </div>

        <div className="install-panel">
          <div className="install-state">
            <span className={`state-symbol ${isInstalled ? 'success' : ''}`}>
              {isInstalled ? <Check size={20} /> : <Download size={20} />}
            </span>
            <div>
              <strong>{isInstalled ? 'App installed' : canInstall ? 'Ready to install' : 'Install from your browser'}</strong>
              <p>
                {isInstalled
                  ? 'TT Learn is running in standalone app mode.'
                  : canInstall
                    ? 'Install now to add TT Learn to your home screen.'
                    : isIos
                      ? 'In Safari, tap Share, then Add to Home Screen.'
                      : 'Use your browser menu and choose Install app or Add to home screen.'}
              </p>
            </div>
          </div>
          {canInstall && !isInstalled && (
            <button className="button" onClick={install}><Download size={18} /> Install app</button>
          )}
        </div>

        <ul className="status-list" aria-label="PWA readiness">
          <li><span>{isOnline ? <Wifi size={19} /> : <WifiOff size={19} />}</span><div><strong>{isOnline ? 'Online' : 'Offline'}</strong><small>Private library data requires the network.</small></div></li>
          <li><span><RefreshCw size={19} /></span><div><strong>Service worker: {serviceWorkerState}</strong><small>{serviceWorkerState === 'development' ? 'Enabled in production builds.' : 'App shell and offline fallback registration.'}</small></div></li>
          <li><span><Share2 size={19} /></span><div><strong>Share target</strong><small>Available only after installation on supported platforms.</small></div></li>
        </ul>

        {updateAvailable && (
          <button className="button secondary" onClick={applyUpdate}>
            <RefreshCw size={18} /> Update app
          </button>
        )}
      </section>

      <section className="settings-section" aria-labelledby="feedback-title">
        <div className="section-heading">
          <div className="section-icon"><MessageSquare size={20} /></div>
          <div><h2 id="feedback-title">Send Feedback</h2><p>Bug reports, feature ideas, or data suggestions — they all help improve TT Learn.</p></div>
        </div>
        <FeedbackForm variant="full" />
      </section>

      <section className="settings-section" aria-labelledby="privacy-title">
        <div className="section-heading">
          <div className="section-icon"><ShieldCheck size={20} /></div>
          <div><h2 id="privacy-title">Privacy</h2><p>Your learning library is private unless you explicitly create a link.</p></div>
        </div>
        <div className="privacy-note">
          <ShieldCheck size={22} />
          <p><strong>Private by default.</strong> Shared links are read-only, revocable, and never expose unrelated learning data.</p>
        </div>
      </section>

      <section className="settings-section" aria-labelledby="version-title">
        <div className="section-heading">
          <div className="section-icon"><RefreshCw size={20} /></div>
          <div><h2 id="version-title">App version</h2><p>Identifies the exact source revision and deployment build time.</p></div>
        </div>
        <BuildIdentity />
      </section>
    </section>
  )
}
