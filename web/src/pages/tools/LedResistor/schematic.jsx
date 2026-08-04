import { forwardRef } from 'react'
import Schematic, { ResistorV, Ground, CurrentArrow } from '../../../components/Schematic'
import { fmtRes, fmtVolt, fmtAmp } from '../../../lib/num'

// Yerleşim kuralı: her yazı kutusu ile çizim elemanı arasında en az 3 px, iki
// yazı kutusu arasında en az 2 px açıklık kalır. Kutu ölçüleri theme.css'ten
// gelir: .sch-label 11 px, .sch-value 10 px, tek aralıklı yazıda karakter
// genişliği ≈ 0.62·fs, kutu = [y − 0.78·fs , y + 0.22·fs].
//
// Yerleşim, biçimlenen değerlerin en uzun hâline göre ölçüldü:
//   • fmtRes/fmtAmp ön ek ölçeklidir, |x| < 1e16 için en fazla "1.00e+4 GΩ" =
//     10 karakter; uç girdide (1e16 ve üstü) "1.000e+7 GΩ" = 11 karakter ≈
//     68 px — sınır 11 karakter alındı.
//   • fmtVolt ön ek kullanmaz, 1e7 V'tan sonra üsse geçer: "1.000e+100 V" =
//     12 karakter ≈ 74 px. Gerilim yazıları bu sınıra göre yerleşti.
//
// Bileşen değeri hiçbir varyantta telin üstüne ya da hizasına yazılmaz: değer
// daima kendi sembolünün altında ve o sembolle aynı eksende ortalı durur.
// Böylece hangi değerin hangi elemana ait olduğu okunur, tel de açıkta kalır.

// .sch-value karakter genişliği: 0.62 × 10 px
const VALUE_CW = 6.2

// LED + seri direnç
// R kolunun sağ iletkeni 110'dan 124'e alındı: direnç değeri en uzun hâlinde
// (11 karakter, 68 px) 48–116 aralığını kaplıyor ve eski iletkenin tam üstüne
// biniyordu. Sağ iletken 124'e gidince yazı ile arasında 6,8 px kalır; toprak
// sembolü de alt rayın yeni başlangıcının içinde kalması için 142'ye kaydı.
// LED gerilimi (150, 104) soldan başlar; 12 karakterde 224'te biter, sağ
// iletkene (230) 4,6 px kalır.
function LedCircuit({ r }) {
  const n = r.ok ? Math.min(r.n, 3) : 1
  // Direnç değeri 48'den başlar; 12 karakterlik uç hâlde (74 px) sağ iletkenin
  // (124) üstüne binerdi, o yüzden sol kenar gerektiği kadar sola kaydırılır:
  // yazı iletkenin 3 px solunda biter, dirence de en az 3 px kalır.
  const sR = r.ok ? fmtRes(r.R, 3) : ''
  const xR = Math.min(48, 120 - sR.length * VALUE_CW)
  return (
    <>
      <g className="sch-wire">
        <line x1={30} x2={30} y1={40} y2={54} />
        <line x1={30} x2={30} y1={98} y2={128} />
        <line x1={30} x2={124} y1={128} y2={128} />
        <line x1={124} x2={124} y1={40} y2={128} />
        <line x1={30} x2={124} y1={40} y2={40} />
      </g>
      <ResistorV x={19} y={54} w={22} h={44} />
      <text className="sch-label" x={48} y={72}>R</text>
      {r.ok && <text className="sch-value" x={xR} y={86}>{sR}</text>}

      {/* LED üçgenleri — seri sayısı üçe kadar gösterilir. Katot çubuğu ile
          sonraki LED'in anodu arasındaki 18 px'lik boşlukta tel yoktu; zincir
          kopuk görünüyordu, bağlantı parçası eklendi (yazıların hiçbirine 18
          px'den yakın geçmiyor). */}
      {Array.from({ length: n }).map((_, i) => (
        <g key={i} transform={`translate(${140 + i * 34}, 62)`}>
          <polygon className="sch-part" points="0,0 0,20 16,10" />
          <line className="sch-wire" x1={16} y1={0} x2={16} y2={20} />
          {i > 0 && <line className="sch-wire" x1={-18} y1={10} x2={0} y2={10} />}
        </g>
      ))}
      <g className="sch-wire">
        <line x1={124} x2={140} y1={72} y2={72} />
        <line x1={124} x2={124} y1={40} y2={72} />
        <line x1={140 + n * 34 - 18} x2={230} y1={72} y2={72} />
        <line x1={230} x2={230} y1={72} y2={128} />
        <line x1={124} x2={230} y1={128} y2={128} />
      </g>
      <Ground x={142} y={128} />
      <text className="sch-label" x={150} y={50}>{r.ok && r.n > 3 ? `${r.n} × LED` : 'LED'}</text>
      {r.ok && <text className="sch-value" x={150} y={104}>{fmtVolt(r.Vled)}</text>}
      {/* Ok üst iletkenin 6 px üstünde; etiketi sağ kola ve ok başına binmesin
          diye ok başının soluna yazılır */}
      <CurrentArrow
        x={92} y={34} dir="right" len={18} labelSide="left"
        label={r.ok ? fmtAmp(r.targetI, 3) : 'I'}
      />
    </>
  )
}

// `ref` yalnızca rapor üretimi için Schematic'e iletilir — bkz. report.js.
const CircuitSchematic = forwardRef(function CircuitSchematic({ r, text }, ref) {
  // viewBox sabit: bu araçta tek devre türü var, dallanma yok.
  return (
    <Schematic
      ref={ref}
      viewBox="0 0 260 150"
      title={text.title}
      caption={text.caption}
    >
      <LedCircuit r={r} />
    </Schematic>
  )
})

export default CircuitSchematic
