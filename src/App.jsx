import { useState } from 'react'
import { S } from './constants/theme'
import { TokenCounter } from './components/ui'
import PageList       from './pages/PageList'
import PageNewFormula from './pages/PageNewFormula'
import PageDetail     from './pages/PageDetail'
import PageAccords    from './pages/PageAccords'
import PageMaterials  from './pages/PageMaterials'
import PageExport     from './pages/PageExport'
import PageProduction from './pages/PageProduction'
import PageMyBlends   from './pages/PageMyBlends'

const NAV = [
  { id:'formulas',   label:'Formulas',   icon:'◈' },
  { id:'accords',    label:'Accords',    icon:'◎' },
  { id:'materials',  label:'Materials',  icon:'⬡' },
  { id:'myblends',   label:'My Blends',  icon:'✦' },
  { id:'production', label:'Production', icon:'○' },
  { id:'export',     label:'Export',     icon:'↓' },
]

export default function App() {
  const [tab,             setTab]             = useState('formulas')
  const [formulaPage,     setFormulaPage]     = useState('list')
  const [selectedFormula, setSelectedFormula] = useState(null)

  const inSubPage = tab === 'formulas' && formulaPage !== 'list'

  return (
    <div style={{ minHeight:'100vh', background:S.bg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Inter:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f8f6f2; font-family: Inter, sans-serif; }
        input, textarea, select { font-size: 16px !important; }
        input:focus, textarea:focus, select:focus { border-color: #d4b896 !important; outline: none; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Header */}
      <div style={{ background:S.white, borderBottom:`1px solid ${S.border}`,
        padding:'14px 20px', position:'sticky', top:0, zIndex:10,
        display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:20, color:S.gold,
          fontStyle:'italic' }}>Perfume Lab</div>
        <div style={{ fontSize:11, color:S.textLt }}>by Supabase + Claude AI</div>
      </div>

      {/* Token tracker (top-right float) */}
      <TokenCounter/>

      {/* Page Content */}
      <div style={{ maxWidth:600, margin:'0 auto', padding:'20px 16px 90px' }}>

        {/* ── Formulas ─────────────────────────────────────── */}
        {tab === 'formulas' && formulaPage === 'list' && (
          <PageList
            onSelect={f => { setSelectedFormula(f); setFormulaPage('detail') }}
            onCreate={() => setFormulaPage('newFormula')}
          />
        )}
        {tab === 'formulas' && formulaPage === 'newFormula' && (
          <PageNewFormula
            onBack={() => setFormulaPage('list')}
            onCreate={f => { setSelectedFormula(f); setFormulaPage('detail') }}
          />
        )}
        {tab === 'formulas' && formulaPage === 'detail' && selectedFormula && (
          <PageDetail
            formula={selectedFormula}
            onBack={() => setFormulaPage('list')}
          />
        )}

        {/* ── Accords ──────────────────────────────────────── */}
        {tab === 'accords' && <PageAccords/>}

        {/* ── Materials ────────────────────────────────────── */}
        {tab === 'materials' && <PageMaterials/>}

        {/* ── My Blends ────────────────────────────────────── */}
        {tab === 'myblends' && <PageMyBlends/>}

        {/* ── Production ───────────────────────────────────── */}
        {tab === 'production' && <PageProduction/>}

        {/* ── Export ───────────────────────────────────────── */}
        {tab === 'export' && <PageExport/>}
      </div>

      {/* Bottom Nav */}
      {!inSubPage && (
        <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:20,
          background:S.white, borderTop:`1px solid ${S.border}`,
          display:'flex', justifyContent:'center' }}>
          <div style={{ display:'flex', maxWidth:600, width:'100%' }}>
            {NAV.map(n => {
              const active = tab === n.id
              return (
                <button key={n.id}
                  onClick={() => {
                    setTab(n.id)
                    if (n.id === 'formulas') setFormulaPage('list')
                  }}
                  style={{ flex:1, padding:'12px 0 14px', background:'none', border:'none',
                    cursor:'pointer', display:'flex', flexDirection:'column',
                    alignItems:'center', gap:3 }}>
                  <span style={{ fontSize:18, lineHeight:1, color: active ? S.gold : S.textLt }}>
                    {n.icon}
                  </span>
                  <span style={{ fontSize:10, fontFamily:'Inter,sans-serif', fontWeight:500,
                    letterSpacing:.3, color: active ? S.gold : S.textLt }}>
                    {n.label}
                  </span>
                  {active && (
                    <span style={{ width:20, height:2, background:S.gold, borderRadius:1, marginTop:1 }}/>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
