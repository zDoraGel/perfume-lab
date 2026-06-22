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
import PageDashboard  from './pages/PageDashboard'
import PageRetailStock from './pages/PageRetailStock'
import PageReport     from './pages/PageReport'
import PageLotPlanning from './pages/PageLotPlanning'
import PageExpenses    from './pages/PageExpenses'
import PageMaterialToFormula from './pages/PageMaterialToFormula'

const NAV = [
  { id:'dashboard', label:'Dashboard', icon:'◉' },
  { id:'formula',   label:'Formula',   icon:'◈' },
  { id:'orders',    label:'Orders',    icon:'○' },
  { id:'finance',   label:'Finance',   icon:'◱' },
  { id:'more',      label:'More',      icon:'⬡' },
]

const ORDERS_SUBTABS = [
  { id:'production', label:'Production' },
  { id:'retail',      label:'Retail' },
  { id:'myblends',    label:'My Blends' },
  { id:'lot',         label:'Lot' },
]

const FINANCE_SUBTABS = [
  { id:'report',   label:'Report' },
  { id:'expenses', label:'Expenses' },
  { id:'export',   label:'Export' },
]

const MORE_SUBTABS = [
  { id:'accords', label:'Accords' },
  { id:'materialIdea', label:'จาก Material' },
]

function SubTabBar({ items, active, onChange }) {
  return (
    <div style={{ display:'flex', gap:6, overflowX:'auto', WebkitOverflowScrolling:'touch',
      scrollbarWidth:'none', msOverflowStyle:'none', marginBottom:18 }}>
      {items.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          style={{ flexShrink:0, padding:'7px 16px', borderRadius:20, cursor:'pointer',
            fontSize:12, fontFamily:'Inter,sans-serif', fontWeight: active === t.id ? 600 : 400,
            border:`1.5px solid ${active === t.id ? S.gold : S.border}`,
            background: active === t.id ? S.goldLt : 'transparent',
            color: active === t.id ? S.gold : S.textMid }}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

export default function App() {
  const [tab,             setTab]             = useState('formula')
  const [ordersSub,       setOrdersSub]       = useState('production')
  const [financeSub,      setFinanceSub]      = useState('report')
  const [moreSub,         setMoreSub]         = useState('accords')
  const [formulaPage,     setFormulaPage]     = useState('list')
  const [selectedFormula, setSelectedFormula] = useState(null)
  const [formulaSeed,     setFormulaSeed]     = useState(null) // ข้อมูลตั้งต้นจาก Trend สำหรับ New Formula

  const inSubPage = tab === 'formula' && formulaPage !== 'list'

  function goFormulaDetail(f) {
    setSelectedFormula(f)
    setTab('formula')
    setFormulaPage('detail')
  }

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

        {/* ── Dashboard ────────────────────────────────────── */}
        {tab === 'dashboard' && (
          <PageDashboard onNavigate={(t, payload) => {
            // map dashboard quick-action targets to new tab structure
            if (t === 'expenses') { setTab('finance'); setFinanceSub('expenses') }
            else if (t === 'export') { setTab('finance'); setFinanceSub('export') }
            else if (t === 'report') { setTab('finance'); setFinanceSub('report') }
            else if (t === 'lot') { setTab('orders'); setOrdersSub('lot') }
            else if (t === 'formulas') { setTab('formula'); setFormulaPage('list') }
            else if (t === 'new-formula') {
              setFormulaSeed(payload || null)
              setTab('formula'); setFormulaPage('newFormula')
            }
            else setTab(t)
          }}/>
        )}

        {/* ── Formula ──────────────────────────────────────── */}
        {tab === 'formula' && formulaPage === 'list' && (
          <PageList
            onSelect={f => { setSelectedFormula(f); setFormulaPage('detail') }}
            onCreate={() => setFormulaPage('newFormula')}
          />
        )}
        {tab === 'formula' && formulaPage === 'newFormula' && (
          <PageNewFormula
            initialVibe={formulaSeed?.vibe}
            initialPreferMats={formulaSeed?.preferMats}
            onBack={() => { setFormulaPage('list'); setFormulaSeed(null) }}
            onCreate={f => { setSelectedFormula(f); setFormulaPage('detail'); setFormulaSeed(null) }}
          />
        )}
        {tab === 'formula' && formulaPage === 'detail' && selectedFormula && (
          <PageDetail
            formula={selectedFormula}
            onBack={() => setFormulaPage('list')}
          />
        )}

        {/* ── Orders (Production / Retail / My Blends / Lot) ── */}
        {tab === 'orders' && (
          <>
            <SubTabBar items={ORDERS_SUBTABS} active={ordersSub} onChange={setOrdersSub}/>
            {ordersSub === 'production' && <PageProduction/>}
            {ordersSub === 'retail'     && <PageRetailStock/>}
            {ordersSub === 'myblends'   && <PageMyBlends/>}
            {ordersSub === 'lot' && (
              <PageLotPlanning onSelectFormula={goFormulaDetail}/>
            )}
          </>
        )}

        {/* ── Finance (Report / Expenses / Export) ──────────── */}
        {tab === 'finance' && (
          <>
            <SubTabBar items={FINANCE_SUBTABS} active={financeSub} onChange={setFinanceSub}/>
            {financeSub === 'report'   && <PageReport/>}
            {financeSub === 'expenses' && <PageExpenses onBack={() => setTab('dashboard')}/>}
            {financeSub === 'export'   && <PageExport/>}
          </>
        )}

        {/* ── More (Accords / Materials) ─────────────────────── */}
        {tab === 'more' && (
          <>
            <SubTabBar items={[...MORE_SUBTABS, { id:'materials', label:'Materials' }]}
              active={moreSub} onChange={setMoreSub}/>
            {moreSub === 'accords'   && <PageAccords/>}
            {moreSub === 'materialIdea' && (
              <PageMaterialToFormula
                onBack={() => setMoreSub('accords')}
                onSaved={(newFormula) => {
                  setSelectedFormula(newFormula)
                  setTab('formula')
                  setFormulaPage('detail')
                }}
              />
            )}
            {moreSub === 'materials' && <PageMaterials/>}
          </>
        )}
      </div>

      {/* Bottom Nav */}
      {!inSubPage && (
        <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:20,
          background:S.white, borderTop:`1px solid ${S.border}` }}>
          <div style={{ display:'flex', maxWidth:600, margin:'0 auto' }}>
            {NAV.map(n => {
              const active = tab === n.id
              return (
                <button key={n.id}
                  onClick={() => {
                    setTab(n.id)
                    if (n.id === 'formula') setFormulaPage('list')
                  }}
                  style={{ flex:1, padding:'12px 0 14px',
                    background:'none', border:'none', cursor:'pointer',
                    display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
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
