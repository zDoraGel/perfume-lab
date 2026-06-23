import { useState } from 'react'
import { supabase } from '../lib/supabase'

const INK  = '#2a1f14'
const GOLD = '#8a6f4e'
const BG   = '#f8f5f0'
const BORDER = '#e8e0d4'

export default function PageLogin({ onLoggedIn }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
        : err.message)
      setLoading(false)
      return
    }
    onLoggedIn(data.session)
  }

  return (
    <div style={{ minHeight:'100vh', background:BG, display:'flex',
      alignItems:'center', justifyContent:'center', padding:20 }}>
      <form onSubmit={handleSubmit} style={{ width:'100%', maxWidth:340,
        background:'#fff', borderRadius:16, padding:'36px 28px',
        border:`1px solid ${BORDER}` }}>

        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:16, fontWeight:600, color:INK, letterSpacing:3 }}>
            LINEN THEORY
          </div>
          <div style={{ fontSize:11, color:GOLD, fontStyle:'italic', marginTop:2 }}>
            Perfume Lab
          </div>
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, color:'#6b5648', display:'block', marginBottom:6 }}>
            อีเมล
          </label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            required autoFocus
            style={{ width:'100%', padding:'11px 14px', borderRadius:10,
              border:`1.5px solid ${BORDER}`, fontSize:14, boxSizing:'border-box' }}/>
        </div>

        <div style={{ marginBottom:18 }}>
          <label style={{ fontSize:11, color:'#6b5648', display:'block', marginBottom:6 }}>
            รหัสผ่าน
          </label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            required
            style={{ width:'100%', padding:'11px 14px', borderRadius:10,
              border:`1.5px solid ${BORDER}`, fontSize:14, boxSizing:'border-box' }}/>
        </div>

        {error && (
          <div style={{ fontSize:12, color:'#c0392b', marginBottom:14, textAlign:'center' }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading}
          style={{ width:'100%', padding:'12px 0', borderRadius:10, cursor:'pointer',
            background:'#5a4a3a', border:'none', color:'#fff', fontSize:14, fontWeight:600,
            opacity: loading ? 0.6 : 1 }}>
          {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </div>
  )
}
