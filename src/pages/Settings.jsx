import { useAuth } from '../lib/AuthContext'
import { useT, useLocale, LOCALES } from '../lib/i18n.jsx'

export default function Settings() {
  const { profile } = useAuth()
  const t = useT()
  const { locale, setLocale } = useLocale()

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.[0]?.toUpperCase() ?? 'U'

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>{t('settings_title')}</h1>

      {/* Profile */}
      <div style={{ background: '#fff', border: '1px solid #E8E6E0', borderRadius: 14, padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#5C5A54', marginBottom: 12 }}>{t('settings_profile')}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#FFD93D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#7A5C00', flexShrink: 0 }}>{initials}</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>{profile?.full_name || 'My Account'}</div>
            <div style={{ fontSize: 12, color: '#9C9A94' }}>{profile?.email}</div>
          </div>
          <button style={{ marginLeft: 'auto', padding: '5px 12px', border: '1px solid #D0CEC8', borderRadius: 8, fontSize: 12, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>{t('settings_edit')}</button>
        </div>
      </div>

      {/* Language */}
      <div style={{ background: '#fff', border: '1px solid #E8E6E0', borderRadius: 14, padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#5C5A54', marginBottom: 4 }}>{t('settings_language')}</div>
        <div style={{ fontSize: 11, color: '#9C9A94', marginBottom: 12 }}>{t('settings_language_sub')}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {Object.entries(LOCALES).map(([code, name]) => (
            <button key={code} onClick={() => setLocale(code)} style={{
              flex: 1, padding: '10px 16px', border: '2px solid',
              borderColor: locale === code ? '#E6BE00' : '#E8E6E0',
              borderRadius: 10, fontSize: 13, fontWeight: locale === code ? 600 : 400,
              background: locale === code ? '#FFF8DC' : '#fff',
              color: locale === code ? '#7A5C00' : '#5C5A54',
              cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 20 }}>{code === 'en' ? '🇬🇧' : '🇫🇷'}</span>
              {name}
              {locale === code && <span style={{ fontSize: 12 }}>✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Connected stores */}
      <div style={{ background: '#fff', border: '1px solid #E8E6E0', borderRadius: 14, padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#5C5A54', marginBottom: 12 }}>{t('settings_stores')}</div>
        {[
          { name: 'Kroger', sub: t('settings_primary'), connected: true },
          { name: 'Walmart', sub: t('settings_compare'), connected: false },
          { name: 'Costco', sub: t('settings_compare'), connected: false },
        ].map(store => (
          <div key={store.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #F0EEE8' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: store.connected ? '#E8F5E9' : '#F5F4F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-building-store" style={{ color: store.connected ? '#1A4D1F' : '#9C9A94', fontSize: 16 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{store.name}</div>
              <div style={{ fontSize: 11, color: '#9C9A94' }}>{store.sub}</div>
            </div>
            {store.connected
              ? <span style={{ background: '#E8F5E9', color: '#1A4D1F', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>{t('settings_connected')}</span>
              : <button style={{ padding: '5px 12px', border: '1px solid #D0CEC8', borderRadius: 8, fontSize: 12, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>{t('settings_connect')}</button>}
          </div>
        ))}
      </div>

      {/* Notifications */}
      <div style={{ background: '#fff', border: '1px solid #E8E6E0', borderRadius: 14, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#5C5A54', marginBottom: 12 }}>{t('settings_notifications')}</div>
        {[
          { label: t('settings_budget_alerts'), sub: t('settings_budget_sub'), on: true },
          { label: t('settings_loan_reminders'), sub: t('settings_loan_sub'), on: true },
          { label: t('settings_price_alerts'), sub: t('settings_price_sub'), on: true },
          { label: t('settings_weekly'), sub: t('settings_weekly_sub'), on: false },
        ].map(n => (
          <div key={n.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #F0EEE8' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{n.label}</div>
              <div style={{ fontSize: 11, color: '#9C9A94' }}>{n.sub}</div>
            </div>
            <span style={{ background: n.on ? '#E8F5E9' : '#F5F4F0', color: n.on ? '#1A4D1F' : '#9C9A94', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>
              {n.on ? t('settings_on') : t('settings_off')}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
