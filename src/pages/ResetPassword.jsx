import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../lib/i18n.jsx'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const navigate = useNavigate()
  const t = useT()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMessage(t('login_reset_sub'))
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleReset(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError(t('reset_no_match')); return }
    if (password.length < 6) { setError(t('reset_too_short')); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message) }
    else { setMessage(t('reset_success')); setTimeout(() => navigate('/login'), 2000) }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#FFF8DC 0%,#FFFBF0 100%)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-block', background: '#FFD93D', padding: '8px 18px', borderRadius: 12, fontSize: 22, fontWeight: 700, color: '#7A5C00', marginBottom: 6 }}>💛 {t('app_name')}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #E8E6E0' }}>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>{t('login_reset_title')}</div>
          <div style={{ fontSize: 13, color: '#9C9A94', marginBottom: 20 }}>{t('reset_confirm_password')}</div>
          {error   && <div style={{ background: '#FFEBEE', color: '#8B0000', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}
          {message && <div style={{ background: '#E8F5E9', color: '#1A4D1F', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{message}</div>}
          <form onSubmit={handleReset}>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>{t('reset_new_password')}</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder={t('login_password_ph')} required minLength={6} style={{ ...inp, paddingRight: 42 }} />
                <button type="button" onClick={() => setShowPassword(p => !p)} style={eyeBtn}>{showPassword ? '🙈' : '👁️'}</button>
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>{t('reset_confirm_password')}</label>
              <input type={showPassword ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder={t('reset_confirm_ph')} required minLength={6} style={inp} />
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#FFD93D', color: '#7A5C00', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit' }}>
              {loading ? t('reset_updating') : t('reset_set_btn')}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A5C00', fontSize: 13, fontWeight: 500, fontFamily: 'inherit' }}>
              {t('login_back')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const lbl = { fontSize: 12, fontWeight: 500, color: '#5C5A54', display: 'block', marginBottom: 5 }
const inp = { width: '100%', padding: '9px 12px', border: '1px solid #D0CEC8', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }
const eyeBtn = { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9C9A94', fontSize: 18, padding: 0 }
