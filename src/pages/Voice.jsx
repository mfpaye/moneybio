import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useT } from '../lib/i18n.jsx'

const QUICK_PROMPTS = [
  { icon: '🛒', key: 'voice_quick_list',    example_key: 'voice_quick_list_ex'    },
  { icon: '💸', key: 'voice_quick_expense', example_key: 'voice_quick_expense_ex' },
  { icon: '📊', key: 'voice_quick_summary', example_key: 'voice_quick_summary_ex' },
  { icon: '🧾', key: 'voice_quick_multi',   example_key: 'voice_quick_multi_ex'   },
]

export default function Voice() {
  const { user, profile } = useAuth()
  const t = useT()
  const firstName = profile?.full_name?.split(' ')[0] || ''

  const [messages, setMessages] = useState([{
    role: 'ai',
    text: `${t('voice_greeting')} ${firstName}! 👋\n\n${t('voice_intro')}`
  }])
  const [input, setInput] = useState('')
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [pendingExpense, setPendingExpense] = useState(null)
  const recognitionRef = useRef(null)
  const chatEnd = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Re-initialize greeting when language changes
  useEffect(() => {
    setMessages([{
      role: 'ai',
      text: `${t('voice_greeting')} ${firstName}! 👋\n\n${t('voice_intro')}`
    }])
  }, [t])

  function addMsg(role, text) { setMessages(p => [...p, { role, text }]) }

  async function handleSend() {
    const text = input.trim()
    if (!text) return
    setInput('')
    addMsg('user', text)
    setProcessing(true)

    try {
      // Call Claude API for intelligent parsing
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `You are a helpful financial assistant inside MoneyBio, a personal finance app. The user said: "${text}"

Determine the intent and respond naturally. The app can:
1. Add items to a shopping list
2. Log an expense/transaction
3. Answer spending questions (use sample data: $2,341 spent this month, top categories: Housing $1,200, Groceries $487, Dining $318)
4. Handle multiple store stops

Rules:
- If adding to shopping list: confirm exactly what items were mentioned, using the exact words the user said. Reply with what you added.
- If logging an expense: extract store name, amount, payment method. If missing info ask for it. If you have enough, show a confirmation with the details.
- If a spending question: answer using the sample data above.
- Keep responses SHORT and conversational — 1-3 sentences max.
- Respond in the same language the user wrote in (English, French, or Spanish).
- Never confuse shopping list items with expense logging.
- If unclear between shopping list and expense, ask one clarifying question.

Respond with just the reply text, no JSON, no formatting markers.`
          }]
        })
      })

      const data = await response.json()
      const reply = data.content?.[0]?.text || t('voice_error')

      // Check if Claude identified an expense to confirm
      const hasAmount = /\$[\d,]+|\d+\s*(dollar|euro|peso)/i.test(text)
      const hasStore  = /at|from|to|@/i.test(text) && !/list|shopping/i.test(text)

      if (hasAmount && hasStore && !/list|shopping|add|buy/i.test(text)) {
        // Extract for confirmation card
        const amountMatch = text.match(/\$?([\d,]+(?:\.\d{1,2})?)/)
        const amount = amountMatch ? parseFloat(amountMatch[1].replace(',','')) : null
        const storeMatch = text.match(/(?:at|from|to|@)\s+([A-Z][a-zA-Z\s&']+?)(?:\s+(?:with|using|paid|for|\.|$))/i)
        const merchant = storeMatch ? storeMatch[1].trim() : null

        if (amount && merchant) {
          const paymentMatch = text.match(/apple\s*pay/i) ? 'apple_pay'
            : text.match(/google\s*pay/i) ? 'google_pay'
            : text.match(/credit/i) ? 'credit_card'
            : text.match(/debit/i) ? 'debit_card'
            : text.match(/cash/i) ? 'cash'
            : text.match(/hsa/i) ? 'hsa'
            : 'credit_card'

          setPendingExpense({ merchant, amount, paymentMethod: paymentMatch })
        }
      }

      addMsg('ai', reply)

    } catch (err) {
      addMsg('ai', t('voice_error_fallback'))
    }

    setProcessing(false)
  }

  async function confirmExpense() {
    if (!pendingExpense) return
    addMsg('ai', `✅ ${t('voice_saved')} **${pendingExpense.merchant}** — $${pendingExpense.amount.toFixed(2)} (${pendingExpense.paymentMethod.replace(/_/g,' ')}). ${t('voice_find_in_expenses')}`)
    setPendingExpense(null)
  }

  function cancelExpense() {
    setPendingExpense(null)
    addMsg('ai', t('voice_cancelled'))
  }

  function startRecording() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      addMsg('ai', t('voice_no_support'))
      return
    }
    const recognition = new SpeechRecognition()
    // Keep listening until user manually stops — don't auto-stop on pauses
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognitionRef.current = recognition

    recognition.onstart = () => setRecording(true)

    recognition.onresult = (e) => {
      // Show live transcript as user speaks
      const transcript = Array.from(e.results).map(r => r[0].transcript).join('')
      setInput(transcript)
    }

    recognition.onend = () => {
      setRecording(false)
      // Do NOT auto-send — let user review and press Send manually
    }

    recognition.onerror = (e) => {
      setRecording(false)
      if (e.error === 'not-allowed') {
        addMsg('ai', t('voice_mic_denied'))
      }
    }

    recognition.start()
  }

  function stopRecording() {
    recognitionRef.current?.stop()
    setRecording(false)
    // Focus input so user can review and edit before sending
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
      <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, flexShrink: 0 }}>{t('voice_title')}</h1>

      {/* Quick prompt cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12, flexShrink: 0 }}>
        {QUICK_PROMPTS.map(p => (
          <button key={p.key} onClick={() => { setInput(t(p.example_key)); inputRef.current?.focus() }} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: '#fff', border: '1px solid #E8E6E0', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{p.icon}</span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#1A1A18' }}>{t(p.key)}</div>
              <div style={{ fontSize: 10, color: '#9C9A94', marginTop: 2 }}>{t(p.example_key)}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Chat messages */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#fff', border: '1px solid #E8E6E0', borderRadius: 14, padding: 14, marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ maxWidth: '88%', alignSelf: m.role === 'ai' ? 'flex-start' : 'flex-end' }}>
            <div style={{ padding: '9px 13px', fontSize: 13, lineHeight: 1.55, borderRadius: m.role === 'ai' ? '4px 14px 14px 14px' : '14px 4px 14px 14px', background: m.role === 'ai' ? '#F5F4F0' : '#FFD93D', color: m.role === 'ai' ? '#1A1A18' : '#7A5C00', whiteSpace: 'pre-wrap' }}
              dangerouslySetInnerHTML={{ __html: m.text.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>') }}
            />
          </div>
        ))}

        {/* Expense confirmation card */}
        {pendingExpense && (
          <div style={{ background: '#FFF8DC', border: '1px solid #FFD93D', borderRadius: 12, padding: 14, alignSelf: 'flex-start', maxWidth: '92%' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#7A5C00', marginBottom: 10 }}>{t('voice_confirm_expense')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
              {[
                [t('voice_store'), pendingExpense.merchant],
                [t('voice_amount'), `$${pendingExpense.amount.toFixed(2)}`],
                [t('voice_payment'), pendingExpense.paymentMethod.replace(/_/g,' ')],
              ].map(([label, value]) => (
                <div key={label} style={{ background: '#fff', borderRadius: 8, padding: '7px 10px' }}>
                  <div style={{ fontSize: 10, color: '#9C9A94' }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={cancelExpense} style={{ flex: 1, padding: '8px', background: '#fff', border: '1px solid #D0CEC8', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>{t('voice_edit')}</button>
              <button onClick={confirmExpense} style={{ flex: 2, padding: '8px', background: '#FFD93D', color: '#7A5C00', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{t('voice_save_expense')}</button>
            </div>
          </div>
        )}

        {processing && (
          <div style={{ alignSelf: 'flex-start', padding: '9px 13px', background: '#F5F4F0', borderRadius: '4px 14px 14px 14px', fontSize: 13, color: '#9C9A94' }}>
            {t('voice_processing')}
          </div>
        )}
        <div ref={chatEnd} />
      </div>

      {/* Mic button */}
      <div style={{ textAlign: 'center', marginBottom: 10, flexShrink: 0 }}>
        <button
          onClick={recording ? stopRecording : startRecording}
          style={{ width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer', background: recording ? 'linear-gradient(135deg,#FF3B30,#FF6B6B)' : 'linear-gradient(135deg,#FF6B6B,#FF9A3C)', boxShadow: recording ? '0 0 0 8px rgba(255,59,48,0.15)' : '0 4px 18px rgba(255,107,107,0.22)', transition: 'all 0.2s' }}>
          <i className={`ti ${recording ? 'ti-player-stop' : 'ti-microphone'}`} style={{ fontSize: 22, color: '#fff' }} />
        </button>
        <div style={{ fontSize: 11, color: recording ? '#FF3B30' : '#9C9A94', marginTop: 4, fontWeight: recording ? 600 : 400 }}>
          {recording ? `🔴 ${t('voice_listening')}` : t('voice_tap')}
        </div>
        {recording && (
          <div style={{ fontSize: 10, color: '#9C9A94', marginTop: 2 }}>{t('voice_tap_stop')}</div>
        )}
      </div>

      {/* Text input — user reviews before sending */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <input
          ref={inputRef}
          id="voice-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={t('voice_ph')}
          style={{ flex: 1, padding: '10px 14px', border: '1px solid #D0CEC8', borderRadius: 24, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || processing}
          style={{ padding: '10px 16px', background: '#FFD93D', color: '#7A5C00', border: 'none', borderRadius: 24, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: input.trim() ? 1 : 0.5 }}>
          {t('voice_send')}
        </button>
      </div>
    </div>
  )
}
