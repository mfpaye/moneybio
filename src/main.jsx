import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Tabler icons
const link = document.createElement('link')
link.rel = 'stylesheet'
link.href = 'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css'
document.head.appendChild(link)

// Global styles
const style = document.createElement('style')
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  body { background: #FAFAF8; color: #1A1A18; -webkit-font-smoothing: antialiased; }
  .loading-screen { display: flex; align-items: center; justify-content: center; height: 100vh; background: #FAFAF8; }
  .spinner { width: 32px; height: 32px; border: 3px solid #E8E6E0; border-top-color: #FFD93D; border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  input, select, textarea, button { font-family: inherit; }
  a { color: inherit; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #D0CEC8; border-radius: 3px; }
`
document.head.appendChild(style)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
