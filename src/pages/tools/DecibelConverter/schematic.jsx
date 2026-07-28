import Schematic, { ResistorV, Terminal, Ground } from '../../../components/Schematic'
import { fmt, fmtEng, fmtOhm, fmtVolt } from '../../../lib/num'
import { MODE_POWER, MODE_VOLTAGE, MODE_DBM } from './model'

// İki kapılı blok: solda giriş, ortada dönüşüm, sağda çıkış.
// dBm modunda çıkış kapısı yerine referans empedans yükü çizilir; çünkü
// mutlak seviyenin gerilim karşılığı ancak bir yük üzerinde tanımlıdır.
export default function DecibelSchematic({ r, text }) {
  const live = r.ok
  const mode = live ? r.mode : MODE_POWER
  const isDbm = mode === MODE_DBM
  const isVolt = mode === MODE_VOLTAGE

  const inLabel = isDbm ? 'P' : isVolt ? 'V₁' : 'P₁'
  const outLabel = isVolt ? 'V₂' : 'P₂'

  const inValue = !live
    ? null
    : isDbm
      ? fmtEng(r.W, 'W', 3)
      : isVolt
        ? (r.V1 != null ? fmtVolt(r.V1) : null)
        : (r.P1 != null ? fmtEng(r.P1, 'W', 3) : null)

  const outValue = !live || isDbm
    ? null
    : isVolt
      ? (r.V2 != null ? fmtVolt(r.V2) : null)
      : (r.P2 != null ? fmtEng(r.P2, 'W', 3) : null)

  const blockLabel = isDbm ? 'dBm' : isVolt ? '20·log₁₀' : '10·log₁₀'
  const blockValue = !live ? null : isDbm ? `${fmt(r.dBm, 4)} dBm` : `${fmt(r.dB, 4)} dB`

  const ratioValue = !live || isDbm
    ? null
    : text.ratioValue(fmt(isVolt ? r.voltageRatio : r.powerRatio, 3))

  return (
    <Schematic
      viewBox="0 0 272 142"
      title={text.title}
      caption={isDbm ? text.captionDbm : text.captionRatio}
    >
      {/* Giriş kapısı */}
      <line className="sch-wire" x1={26} x2={88} y1={40} y2={40} />
      <Terminal x={26} y={40} r={3.5} />
      <Terminal x={26} y={94} r={3.5} />

      {/* Dönüşüm bloğu — kutu, en uzun değer satırını (ör. "-1.234e-5 dBm")
          kenarlara değmeden alacak genişlikte; iki satır kutunun ortasına
          göre dengelenmiştir. */}
      <rect className="sch-part" x={88} y={18} width={92} height={44} rx={2} />
      <text className="sch-label" x={134} y={36} textAnchor="middle">{blockLabel}</text>
      {blockValue && (
        <text className="sch-value" x={134} y={50} textAnchor="middle">{blockValue}</text>
      )}

      {/* Çıkış kapısı ya da referans yük */}
      {isDbm ? (
        <>
          <line className="sch-wire" x1={180} x2={198} y1={40} y2={40} />
          <line className="sch-wire" x1={198} x2={198} y1={40} y2={52} />
          <ResistorV x={187} y={52} w={22} h={32} />
          <line className="sch-wire" x1={198} x2={198} y1={84} y2={94} />
          <text className="sch-label" x={216} y={64}>Z₀</text>
          {live && <text className="sch-value" x={216} y={78}>{fmtOhm(r.Z)}</text>}
        </>
      ) : (
        <>
          <line className="sch-wire" x1={180} x2={242} y1={40} y2={40} />
          <Terminal x={242} y={40} r={3.5} />
          <Terminal x={242} y={94} r={3.5} />
        </>
      )}

      {/* Ortak referans (toprak) rayı */}
      <line className="sch-wire" x1={26} x2={isDbm ? 198 : 242} y1={94} y2={94} />
      <Ground x={134} y={94} />

      {/* Giriş etiketi ve değeri — değer, blok tabanı ile toprak rayı
          arasındaki boş şeride yerleşir. */}
      <text className="sch-label" x={24} y={28}>{inLabel}</text>
      {inValue && <text className="sch-value" x={24} y={80}>{inValue}</text>}

      {/* Çıkış etiketi ve değeri */}
      {!isDbm && (
        <>
          <text className="sch-label" x={244} y={28} textAnchor="end">{outLabel}</text>
          {outValue && <text className="sch-value" x={244} y={80} textAnchor="end">{outValue}</text>}
        </>
      )}

      {/* Alt açıklama satırı — dBm modunda yük üzerindeki RMS gerilim, diğer
          modlarda oranın sayısal karşılığı. İkisi aynı anda çizilmez; bu satır
          toprak sembolünün altında kalır. */}
      {isDbm && live && (
        <text className="sch-value" x={134} y={126} textAnchor="middle">{fmtVolt(r.Vrms)} RMS</text>
      )}
      {ratioValue && (
        <text className="sch-value" x={134} y={126} textAnchor="middle">{ratioValue}</text>
      )}
    </Schematic>
  )
}
