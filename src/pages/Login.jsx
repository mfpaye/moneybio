import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useT, useLocale } from '../lib/i18n.jsx'
import { supabase } from '../lib/supabase'

export default function Login() {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const t = useT()
  const { locale, setLocale } = useLocale()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setMessage(''); setLoading(true)
    try {
      if (mode === 'signup') {
        const { error } = await signUp(email, password, fullName)
        if (error) throw error
        setMessage(t('login_check_email'))
        setMode('signin')
      } else if (mode === 'signin') {
        const { error } = await signIn(email, password)
        if (error) throw error
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/reset-password',
        })
        if (error) throw error
        setMessage(t('login_reset_sent'))
      }
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const LANGS = [
    { code: 'en', flag: '🇬🇧', label: 'English' },
    { code: 'fr', flag: '🇫🇷', label: 'Français' },
    { code: 'es', flag: '🇪🇸', label: 'Español' },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#FFF8DC 0%,#FFFBF0 100%)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Language toggle — all 3 languages */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
          {LANGS.map(lang => (
            <button key={lang.code} onClick={() => setLocale(lang.code)} style={{ padding: '5px 14px', borderRadius: 20, border: '1px solid', borderColor: locale === lang.code ? '#E6BE00' : '#E8E6E0', background: locale === lang.code ? '#FFF8DC' : '#fff', color: locale === lang.code ? '#7A5C00' : '#5C5A54', fontSize: 12, fontWeight: locale === lang.code ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>
              {lang.flag} {lang.label}
            </button>
          ))}
        </div>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-block', background: '#FFD93D', padding: '8px 18px', borderRadius: 12, fontSize: 22, fontWeight: 700, color: '#7A5C00', marginBottom: 6 }}>💛 {t('app_name')}</div>
          <div style={{ fontSize: 14, color: '#9C9A94' }}>{t('tagline')}</div>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #E8E6E0' }}>

          {/* Mode tabs */}
          {mode !== 'forgot' && (
            <div style={{ display: 'flex', marginBottom: 24, border: '1px solid #E8E6E0', borderRadius: 10, overflow: 'hidden' }}>
              {['signin','signup'].map(m => (
                <button key={m} onClick={() => { setMode(m); setError(''); setMessage('') }} style={{ flex: 1, padding: '10px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: mode === m ? '#FFD93D' : '#fff', color: mode === m ? '#7A5C00' : '#5C5A54', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                  {m === 'signin' ? t('login_signin') : t('login_signup')}
                </button>
              ))}
            </div>
          )}

          {/* Forgot password header */}
          {mode === 'forgot' && (
            <div style={{ marginBottom: 20 }}>
              <button onClick={() => { setMode('signin'); setError(''); setMessage('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A5C00', fontSize: 13, fontWeight: 500, padding: 0, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
                {t('login_back')}
              </button>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{t('login_reset_title')}</div>
              <div style={{ fontSize: 12, color: '#9C9A94', marginTop: 4 }}>{t('login_reset_sub')}</div>
            </div>
          )}

          {/* Messages */}
          {error   && <div style={{ background: '#FFEBEE', color: '#8B0000', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}
          {message && <div style={{ background: '#E8F5E9', color: '#1A4D1F', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{message}</div>}

          <form onSubmit={handleSubmit}>
            {/* Full name — signup only */}
            {mode === 'signup' && (
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>{t('login_fullname')}</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder={t('login_fullname_ph')} required style={inp} />
              </div>
            )}

            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>{t('login_email')}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('login_email_ph')} required style={inp} />
            </div>

            {/* Password */}
            {mode !== 'forgot' && (
              <div style={{ marginBottom: 8 }}>
                <label style={lbl}>{t('login_password')}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={t('login_password_ph')}
                    required
                    minLength={6}
                    style={{ ...inp, paddingRight: 42 }}
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9C9A94', fontSize: 18, padding: 0 }}>
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            )}

            {/* Forgot password link */}
            {mode === 'signin' && (
              <div style={{ textAlign: 'right', marginBottom: 20 }}>
                <button type="button" onClick={() => { setMode('forgot'); setError(''); setMessage('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A5C00', fontSize: 12, fontWeight: 500, fontFamily: 'inherit' }}>
                  {t('login_forgot')}
                </button>
              </div>
            )}

            {mode === 'signup' && <div style={{ marginBottom: 20 }} />}

            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#FFD93D', color: '#7A5C00', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit' }}>
              {loading ? t('login_loading') : mode === 'signin' ? t('login_signin') : mode === 'signup' ? t('login_signup') : t('login_reset_btn')}
            </button>
          </form>

          {/* Google — not on forgot screen */}
          {mode !== 'forgot' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
                <div style={{ flex: 1, height: 1, background: '#E8E6E0' }} />
                <span style={{ fontSize: 12, color: '#9C9A94' }}>or</span>
                <div style={{ flex: 1, height: 1, background: '#E8E6E0' }} />
              </div>
              <button onClick={() => signInWithGoogle()} style={{ width: '100%', padding: '11px', background: '#fff', color: '#1A1A18', border: '1px solid #D0CEC8', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                {t('login_google')}
              </button>
            </>
          )}
        </div>
        <p style={{ textAlign: 'center', fontSize: 11, color: '#9C9A94', marginTop: 16 }}>{t('login_terms')}</p>
      </div>
    </div>
  )
}

const lbl = { fontSize: 12, fontWeight: 500, color: '#5C5A54', display: 'block', marginBottom: 5 }
const inp = { width: '100%', padding: '9px 12px', border: '1px solid #D0CEC8', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }
