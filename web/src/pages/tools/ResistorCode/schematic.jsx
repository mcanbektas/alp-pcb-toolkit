import { forwardRef } from 'react'
import Schematic from '../../../components/Schematic'
import { KIND_COLOR } from './model'

// Yerleşim kuralı: her yazı kutusu çizim elemanlarının ÇİZİLİ KENARINDAN (tel
// kalınlığının yarısı düşülerek) en az 3 px, başka bir yazı kutusundan en az
// 2 px uzakta durur ve viewBox içinde kalır. Kutu ölçüleri theme.css'ten gelir:
// .sch-label 11 px, tek aralıklı yazıda karakter genişliği ≈ 0.62·fs, kutu =
// [y − 0.78·fs , y + 0.22·fs]; tel kalınlığı 2 px → yarım kalınlık 1 px.
// Bu şemadaki tek yazı komponent kodudur; geçerli kod en çok dört hanedir
// (104K), altı haneli hatalı girişte bile en yakın çizili kenara 10 px'ten
// fazla açıklık kalır (kondansatör plakasında 10.4 px).

// Renk bantlı direnç gövdesi. Bant renkleri theme.css'teki --band-<key>
// değişkenlerinden gelir; SVG içine renk yazılmaz.
function ColorBody({ bands }) {
  const n = bands.length
  // Tolerans bandı gövdenin sağ ucunda, diğerleri solda kümelenir
  const left = bands.slice(0, n - 1)
  const tolerance = bands[n - 1]
  const startX = 74
  const gap = 16

  return (
    <>
      <g className="sch-wire">
        <line x1={14} x2={58} y1={70} y2={70} />
        <line x1={202} x2={246} y1={70} y2={70} />
      </g>
      <rect className="sch-body" x={58} y={44} width={144} height={52} rx={12} />

      {left.map((key, i) => (
        <rect
          key={`${key}-${i}`}
          className={`sch-band band-${key}`}
          x={startX + i * gap}
          y={44}
          width={9}
          height={52}
        />
      ))}
      <rect className={`sch-band band-${tolerance}`} x={186} y={44} width={9} height={52} />
    </>
  )
}

// Seramik kondansatör: iki plaka
function CapBody({ code }) {
  return (
    <>
      <g className="sch-wire">
        <line x1={14} x2={118} y1={70} y2={70} />
        <line x1={142} x2={246} y1={70} y2={70} />
      </g>
      <g className="sch-part">
        <line x1={118} x2={118} y1={48} y2={92} />
        <line x1={142} x2={142} y1={48} y2={92} />
      </g>
      <text className="sch-label" x={130} y={112} textAnchor="middle">{code}</text>
    </>
  )
}

// `ref` yalnızca rapor üretimi için Schematic'e iletilir — bkz. report.js.
const CodeSchematic = forwardRef(function CodeSchematic({ r, form, text }, ref) {
  const kind = r.ok ? r.kind : form.kind

  const caption = kind === KIND_COLOR ? text.captionColor : text.captionCap

  return (
    <Schematic ref={ref} viewBox="0 0 260 130" title={text.title} caption={caption}>
      {kind === KIND_COLOR && r.ok && <ColorBody bands={r.bands} />}
      {kind === KIND_COLOR && !r.ok && <rect className="sch-body" x={58} y={44} width={144} height={52} rx={12} />}
      {kind !== KIND_COLOR && <CapBody code={form.cap || text.noCode} />}
    </Schematic>
  )
})

export default CodeSchematic
