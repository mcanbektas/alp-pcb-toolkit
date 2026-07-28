import Schematic, { Node, Ground } from '../../../components/Schematic'
import { fmt } from '../../../lib/num'
import { MODE_HEATSINK, MODE_SURFACE, COPPER_OFF, PSI_JT } from './model'

// Termal yol, seri dirençlerden oluşan bir zincir olarak çizilir:
// junction → case → arayüz → soğutucu → ortam. Zincir seçilen moda göre dallanır.
// §8.6 seçiliyse altta bakır şerit ile dielektriğin paralel yolu eklenir.
//
// Yerleşim kuralı: her yazı kutusu çizim elemanlarından en az 3 px, başka bir
// yazı kutusundan en az 2 px uzakta durur ve viewBox içinde kalır. Kutu ölçüleri
// theme.css'ten gelir: .sch-label 11 px, .sch-value 10 px, tek aralıklı yazıda
// karakter genişliği ≈ 0.62·fs, kutu = [y − 0.78·fs , y + 0.22·fs].
// Üç dirençli zincirde bir yuvaya (52 px) düşen değer yazısı (≈ 74 px) yan yana
// sığmadığı için tek numaralı dirençlerin değeri bir alt satıra iner; uç
// sıcaklıkları da o alt satırda durur.

const BASE_Y = 62
const LEFT_X = 24
const RIGHT_X = 232
const FROM_X = 48
// Zincirin son kutusu 204'te biter: üç dirençli zincirde en sağdaki değer
// yazısı toprak sembolünün ikinci çizgisine (x ≥ 224) 3 px'ten fazla mesafede
// kalsın diye yuva 52 px'e indi.
const TO_X = 204

// Değer satırları: kutuların hemen altı ve bir satır aşağısı
const VALUE_Y = BASE_Y + 28
const VALUE_Y2 = BASE_Y + 42

function partsFor(mode, r, form) {
  const live = r.ok

  if (mode === MODE_HEATSINK) {
    return [
      { key: 'jc', label: 'θ_JC', value: live ? `${fmt(r.thetaJC, 3)} °C/W` : null },
      { key: 'cs', label: 'θ_CS', value: live ? `${fmt(r.thetaCS, 3)} °C/W` : null },
      {
        key: 'sa',
        label: 'θ_SA',
        value: live && r.hasSink ? `${fmt(r.thetaSA, 3)} °C/W` : 'seçilmedi',
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

export default function JunctionSchematic({ r, form, mode }) {
  const live = r.ok
  const copperOn = form.copper !== COPPER_OFF
  const parts = partsFor(mode, r, form)
  const isSurface = mode === MODE_SURFACE

  const span = TO_X - FROM_X
  const slot = span / parts.length
  const boxW = Math.min(44, slot - 14)

  const caption = mode === MODE_HEATSINK
    ? 'Junction → case → termal arayüz → soğutucu → ortam: seri termal dirençler'
    : isSurface
      ? 'Ölçüm noktası ile junction arasındaki ampirik metrik — yol direnci değildir'
      : 'Junction → ortam: tek eşdeğer direnç (θ_JA)'

  return (
    <Schematic
      viewBox={`0 0 260 ${copperOn ? 220 : 128}`}
      title="Termal direnç zinciri"
      caption={caption}
    >
      {/* Zincir teli — kutular üstüne çizilip teli örter */}
      <line className="sch-wire" x1={LEFT_X} x2={RIGHT_X} y1={BASE_Y} y2={BASE_Y} />

      {parts.map((p, i) => {
        const cx = FROM_X + slot * i + slot / 2
        // Komşu değer yazıları tek satırda çakışacağı için tek indeksliler iner
        const valueY = parts.length > 1 && i % 2 === 1 ? VALUE_Y2 : VALUE_Y
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
            <text className="sch-label" x={cx} y={BASE_Y - 19} textAnchor="middle">{p.label}</text>
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
          <text className="sch-label" x={RIGHT_X + 20} y={BASE_Y - 14} textAnchor="end">ölçüm</text>
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

      {/* §8.6 bakır termal ağı — iki paralel iletim yolu */}
      {copperOn && (
        <>
          {/* Bölüm başlığı, alt satıra inen değer yazılarının altında durur */}
          <text className="sch-label dim" x={LEFT_X - 4} y={118}>bakır termal ağı</text>

          <line className="sch-wire" x1={70} x2={70} y1={136} y2={176} />
          <line className="sch-wire" x1={190} x2={190} y1={136} y2={176} />
          <line className="sch-wire" x1={70} x2={102} y1={136} y2={136} />
          <line className="sch-wire" x1={158} x2={190} y1={136} y2={136} />
          <line className="sch-wire" x1={70} x2={102} y1={176} y2={176} />
          <line className="sch-wire" x1={158} x2={190} y1={176} y2={176} />
          <line className="sch-wire" x1={40} x2={70} y1={156} y2={156} />
          <line className="sch-wire" x1={190} x2={214} y1={156} y2={156} />

          <rect className="sch-part" x={102} y={124} width={56} height={24} rx={2} />
          <rect className="sch-part" x={102} y={164} width={56} height={24} rx={2} />
          <text className="sch-label" x={130} y={140} textAnchor="middle">bakır</text>
          <text className="sch-label" x={130} y={180} textAnchor="middle">FR-4</text>

          <Node x={70} y={156} />
          <Node x={190} y={156} />
          <Ground x={214} y={168} />
          <text className="sch-value" x={LEFT_X - 4} y={152}>P</text>

          {live && r.copper && (
            <>
              {/* Kol dirençleri kendi kutusunun yanında ama köprü tellerinin
                  dışında durur: üst değer y=136 telinin üstünde, alt değer
                  y=176 telinin ve toprak sembolünün altında */}
              <text className="sch-value" x={162} y={130}>{fmt(r.copper.strip.Rth, 3)} °C/W</text>
              <text className="sch-value" x={162} y={190}>{fmt(r.copper.dielectric.Rth, 3)} °C/W</text>
              {/* Özet iki satır: tek satırda en uzun değer çifti viewBox'ı aşıyor */}
              <text className="sch-value" x={LEFT_X - 4} y={200}>
                R_θ,eq = {fmt(r.copper.eq.Rth, 3)} °C/W
              </text>
              <text className="sch-value" x={LEFT_X - 4} y={213}>
                ΔT = {fmt(r.copper.rise.deltaT, 3)} °C
              </text>
            </>
          )}
        </>
      )}
    </Schematic>
  )
}
