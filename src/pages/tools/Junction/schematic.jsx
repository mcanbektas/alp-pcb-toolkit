import Schematic, { Node, Ground } from '../../../components/Schematic'
import { fmt } from '../../../lib/num'
import { MODE_HEATSINK, MODE_SURFACE, COPPER_OFF, PSI_JT } from './model'

// Termal yol, seri dirençlerden oluşan bir zincir olarak çizilir:
// junction → case → arayüz → soğutucu → ortam. Zincir seçilen moda göre dallanır.
// §8.6 seçiliyse altta bakır şerit ile dielektriğin paralel yolu eklenir.
//
// Yerleşim kuralı: her yazı kutusu çizim elemanlarının ÇİZİLİ KENARINDAN (tel
// kalınlığının yarısı düşülerek) en az 3 px, başka bir yazı kutusundan en az
// 2 px uzakta durur ve viewBox içinde kalır. Kutu ölçüleri theme.css'ten gelir:
// .sch-label 11 px, .sch-value 10 px, tek aralıklı yazıda karakter genişliği
// ≈ 0.62·fs (kalın ağırlık genişliği değiştirmez), kutu =
// [y − 0.78·fs , y + 0.22·fs]; tel kalınlığı 2 px → yarım kalınlık 1 px.
//
// Soğutucu zincirinde üç değer 52 px'lik yuvalara sığmadığı için eskiden tek
// numaralı dirençlerin değeri alt satıra iniyordu; θ_CS değeri ile sol uçtaki
// junction sıcaklığı aynı satırda çakışıyordu (ölçülen örtüşme −8.7 px, uzun
// değerlerde −10 px) ve en sağdaki değer toprak sembolüne 1.6 px yaklaşıyordu.
// Bu yüzden çizim 260 → 340 px'e genişletildi: zincir yuvası 52 → 80 px oldu,
// her değer kendi kutusunun tam altında ortalanır ve komşusuyla en az 30 px
// açıklık bırakır. Alt satır artık yalnızca uç sıcaklıklarına (T_J solda,
// T_A / ölçüm sağda) ayrılmıştır.
// En uzun makul değer yazısı: fmt(x, 3) çıktısı 1e-4 ≤ x < 1e7 aralığında en
// fazla "0.000123" (8 hane), aralık dışında toExponential(3) → "1.235e-10"
// (9 hane); " °C/W" ekiyle 13–14 karakter = 80.6–86.8 px. Bu uçta değer yuvayı
// (80 px) aşabildiği için yerleşim ölçüyü çalışma anında karşılaştırır ve
// gerekiyorsa tek numaralı değerleri alt satıra indirir (aşağıdaki `stagger`).

const BASE_Y = 62
const LEFT_X = 28
const RIGHT_X = 312
const FROM_X = 52
// Zincirin son kutusu 292'de biter; toprak sembolünün ilk çizgisi 298'de
// başladığı için en sağdaki değer yazısı ile toprak arasında boşluk kalır.
const TO_X = 292

// Değer satırları: kutuların hemen altı (zincir değerleri) ve bir satır
// aşağısı (uç sıcaklıkları). İki satır arası 13 px → üst satırın kutu tabanı
// (92.2) ile alt satırın tepesi (95.2) arasında 3 px kalır; alt satır da §8.6
// bölüm başlığına 3.2 px açıklık bırakır.
const VALUE_Y = BASE_Y + 28
const VALUE_Y2 = BASE_Y + 41

// .sch-value tek aralıklı karakter genişliği (10 px × 0.62)
const VALUE_CH = 6.2

function partsFor(mode, r, form, text) {
  const live = r.ok

  if (mode === MODE_HEATSINK) {
    return [
      { key: 'jc', label: 'θ_JC', value: live ? `${fmt(r.thetaJC, 3)} °C/W` : null },
      { key: 'cs', label: 'θ_CS', value: live ? `${fmt(r.thetaCS, 3)} °C/W` : null },
      {
        key: 'sa',
        label: 'θ_SA',
        value: live && r.hasSink ? `${fmt(r.thetaSA, 3)} °C/W` : text.noSink,
        off: !(live && r.hasSink),
      },
    ]
  }

  if (mode === MODE_SURFACE) {
    const metric = live ? r.metric : form.metric
    return [
      {
        key: 'psi',
        label: metric === PSI_JT ? 'Ψ_JT' : 'Ψ_JB',
        value: live ? `${fmt(r.psi, 3)} °C/W` : null,
        // Ψ bir yol direnci değildir; kesik çizgi bu ayrımı görünür kılar
        dashed: true,
      },
    ]
  }

  return [{ key: 'ja', label: 'θ_JA', value: live ? `${fmt(r.thetaJA, 3)} °C/W` : null }]
}

export default function JunctionSchematic({ r, form, mode, text }) {
  const live = r.ok
  const copperOn = form.copper !== COPPER_OFF
  const parts = partsFor(mode, r, form, text)
  const isSurface = mode === MODE_SURFACE

  const span = TO_X - FROM_X
  const slot = span / parts.length
  const boxW = Math.min(48, slot - 16)

  // Değerler kendi kutusunun altında ortalanır. Komşu iki değer yuvaya 2 px
  // açıklıkla sığdığı sürece hepsi aynı satırda durur; ancak fiziksel olmayan
  // ölçek uçlarında (θ < 0.001 °C/W → "1.235e-4 °C/W" 80.6 px) yazı yuvadan
  // taşar, o durumda tek numaralı değerler alt satıra iner.
  const widest = parts.reduce((m, p) => Math.max(m, p.value ? p.value.length * VALUE_CH : 0), 0)
  const stagger = parts.length > 1 && widest + 2 > slot

  const caption = mode === MODE_HEATSINK
    ? text.captionHeatsink
    : isSurface
      ? text.captionSurface
      : text.captionJunction

  return (
    <Schematic
      viewBox={`0 0 340 ${copperOn ? 224 : 128}`}
      title={text.title}
      caption={caption}
    >
      {/* Zincir teli — kutular üstüne çizilip teli örter */}
      <line className="sch-wire" x1={LEFT_X} x2={RIGHT_X} y1={BASE_Y} y2={BASE_Y} />

      {parts.map((p, i) => {
        const cx = FROM_X + slot * i + slot / 2
        const valueY = stagger && i % 2 === 1 ? VALUE_Y2 : VALUE_Y
        return (
          <g key={p.key}>
            <rect
              className={`sch-part${p.off ? ' off' : ''}${p.dashed ? ' sch-dash' : ''}`}
              x={cx - boxW / 2}
              y={BASE_Y - 13}
              width={boxW}
              height={26}
              rx={2}
            />
            {/* Etiket kutunun üstünde: kutu tepesi 49, etiket tabanı 44.4 → 3.6 px */}
            <text className="sch-label" x={cx} y={BASE_Y - 20} textAnchor="middle">{p.label}</text>
            {p.value && (
              <text className="sch-value" x={cx} y={valueY} textAnchor="middle">{p.value}</text>
            )}
          </g>
        )
      })}

      {/* Sol uç: junction */}
      <Node x={LEFT_X} y={BASE_Y} />
      <text className="sch-label" x={LEFT_X} y={BASE_Y - 14} textAnchor="middle">J</text>
      {live && Number.isFinite(r.Tj) && (
        <text className="sch-value" x={LEFT_X - 4} y={VALUE_Y2}>
          {fmt(r.Tj, 4)} °C
        </text>
      )}

      {/* Sağ uç: ortam ya da ölçüm noktası */}
      {isSurface ? (
        <>
          <Node x={RIGHT_X} y={BASE_Y} />
          {/* Sağa yaslı: en uzun karşılık İngilizce ("measurement",
              11 karakter ≈ 75 px) x = 257'de başlar, zincir kutusu 196'da
              bittiği için çakışmaz; sağ ucu 332, viewBox içinde kalır */}
          <text className="sch-label" x={RIGHT_X + 20} y={BASE_Y - 14} textAnchor="end">
            {text.measurePoint}
          </text>
          {live && (
            <text className="sch-value" x={RIGHT_X + 20} y={VALUE_Y2} textAnchor="end">
              {fmt(r.Tsurface, 4)} °C
            </text>
          )}
        </>
      ) : (
        <>
          <line className="sch-wire" x1={RIGHT_X} x2={RIGHT_X} y1={BASE_Y} y2={BASE_Y + 14} />
          <Ground x={RIGHT_X} y={BASE_Y + 14} />
          <text className="sch-label" x={RIGHT_X + 22} y={BASE_Y - 14} textAnchor="end">T_A</text>
          {live && (
            <text className="sch-value" x={RIGHT_X + 22} y={VALUE_Y2} textAnchor="end">
              {fmt(r.Ta, 4)} °C
            </text>
          )}
        </>
      )}

      {/* §8.6 bakır termal ağı — iki paralel iletim yolu.
          Ağ, genişleyen çizimde zincirle aynı eksende (x = 172) ortalanır */}
      {copperOn && (
        <>
          {/* Bölüm başlığı, uç sıcaklıklarının altında durur: kutu
              [108.4, 119.4] → sıcaklık satırına 3.2 px; bakır kutusu 144'te
              başladığı için Türkçe başlık yazısı (135.1'de biter) kutuya
              girmez. İngilizce karşılık ("copper thermal network", 22 karakter
              ≈ 150 px) x yönünde kutunun altına uzanır; dikeyde yazı tabanı
              119.4, kutunun çizili üst kenarı 123 (kalınlık 2) → 3.6 px açıklık
              korunur, yani en az 3 px kuralı bozulmaz */}
          <text className="sch-label dim" x={LEFT_X - 4} y={117}>{text.copperNetwork}</text>

          <line className="sch-wire" x1={92} x2={92} y1={136} y2={176} />
          <line className="sch-wire" x1={252} x2={252} y1={136} y2={176} />
          <line className="sch-wire" x1={92} x2={144} y1={136} y2={136} />
          <line className="sch-wire" x1={200} x2={252} y1={136} y2={136} />
          <line className="sch-wire" x1={92} x2={144} y1={176} y2={176} />
          <line className="sch-wire" x1={200} x2={252} y1={176} y2={176} />
          <line className="sch-wire" x1={62} x2={92} y1={156} y2={156} />
          <line className="sch-wire" x1={252} x2={282} y1={156} y2={156} />

          <rect className="sch-part" x={144} y={124} width={56} height={24} rx={2} />
          <rect className="sch-part" x={144} y={164} width={56} height={24} rx={2} />
          <text className="sch-label" x={172} y={140} textAnchor="middle">{text.copper}</text>
          <text className="sch-label" x={172} y={180} textAnchor="middle">FR-4</text>

          <Node x={92} y={156} />
          <Node x={252} y={156} />
          <Ground x={282} y={168} />
          <text className="sch-value" x={LEFT_X - 4} y={152}>P</text>

          {live && r.copper && (
            <>
              {/* Kol dirençleri kendi kutusunun yanında ama köprü tellerinin
                  dışında durur: üst değer y=136 telinin üstünde (4.8 px), alt
                  değer y=176 telinin ve toprak sembolünün altında (5.2 px).
                  x=205 → kutuların çizili sağ kenarına (x=200) 4 px kalır */}
              <text className="sch-value" x={205} y={128}>{fmt(r.copper.strip.Rth, 3)} °C/W</text>
              <text className="sch-value" x={205} y={192}>{fmt(r.copper.dielectric.Rth, 3)} °C/W</text>
              {/* Özet iki satır: tek satırda en uzun değer çifti viewBox'ı aşıyor.
                  Üst satır FR-4 kutusunun çizili alt kenarına 6.2 px, alt satır
                  üst satıra 3 px açıklıkla durur; en alt kutu 218.2'de biter */}
              <text className="sch-value" x={LEFT_X - 4} y={203}>
                R_θ,eq = {fmt(r.copper.eq.Rth, 3)} °C/W
              </text>
              <text className="sch-value" x={LEFT_X - 4} y={216}>
                ΔT = {fmt(r.copper.rise.deltaT, 3)} °C
              </text>
            </>
          )}
        </>
      )}
    </Schematic>
  )
}
