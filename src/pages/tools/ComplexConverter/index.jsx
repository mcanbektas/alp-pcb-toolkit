import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import Segmented from '../../../components/Segmented'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import useToolForm from '../../../hooks/useToolForm'
import { fmt, fmtOhm, THOUSANDS_MESSAGE } from '../../../lib/num'
import ComplexSchematic from './schematic'
import {
  INITIAL_FORM, MODES, MODE_RECT,
  SWEEP_PARAMS, SWEEP_MAG, SWEEP_PHASE, PHASE_LIMIT_DEG,
  compute, buildSweep,
} from './model'
import {
  MODE_LABEL, KIND_LABEL, QUADRANT_LABEL, CHART,
  SWEEP_LABEL, SWEEP_AXIS, SWEEP_SERIES, SWEEP_CAPTION, REF_LABEL,
  RANGE_NOTES, SOURCE_NOTES,
  rectText, polarText, reasonText, commentary, validityNotes,
} from './text'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }

export default function ComplexConverter() {
  const { f, set } = useToolForm(INITIAL_FORM)
  const [sweep, setSweep] = useState(SWEEP_MAG)

  const r = useMemo(() => compute(f), [f])
  const s = useMemo(() => buildSweep(r, sweep), [r, sweep])
  const notes = useMemo(() => commentary(r), [r])
  const validity = useMemo(() => validityNotes(r), [r])

  const status = useMemo(() => {
    if (!r.ok || notes.length === 0) return null
    const worst = notes.reduce((acc, n) => (LEVEL_RANK[n.level] > LEVEL_RANK[acc] ? n.level : acc), 'ok')
    const count = notes.filter((n) => n.level === worst).length
    if (worst === 'ok') return { cls: 'ok', text: 'Tüm kontroller geçti' }
    if (worst === 'warn') return { cls: 'warn', text: `Sınıra yakın — ${count} uyarı` }
    return { cls: 'danger', text: `${count} kontrol sınırın dışında` }
  }, [r, notes])

  const chartSeries = s
    ? [{ key: s.param, name: SWEEP_SERIES[s.param], tone: toneClass(0), points: s.points }]
    : []

  const formatY = sweep === SWEEP_PHASE ? (v) => `${fmt(v, 3)}°` : (v) => fmtOhm(v)

  return (
    <>
      {/* 1) BAŞLIK */}
      <Link className="backlink" to="/kategori/uretim-dfm">← PCB Üretim, DFM ve Dönüşümler</Link>

      <div className="tool-header">
        <h1>Complex Number Converter</h1>
        <p>
          Kompleks sayıyı dikdörtgensel (R + jX) ve polar (|Z| ∠ φ) gösterimler arasında çevirir;
          faz açısını hem derece hem radyan verir, empedans bağlamında reaktansın endüktif mi
          kapasitif mi olduğunu ve vektörün hangi çeyrekte durduğunu birlikte gösterir.
        </p>
      </div>

      {/* 2) ÜÇ PANEL */}
      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>Girdiler</h2>

          <ComplexSchematic r={r} />

          <Segmented
            value={f.mode}
            onChange={set('mode')}
            options={MODES.map((m) => ({ value: m, label: MODE_LABEL[m] }))}
          />

          {f.mode === MODE_RECT ? (
            <>
              <NumberField
                label="Gerçel bileşen (R)"
                value={f.R} onChange={set('R')}
                units={['Ω', 'mΩ', 'kΩ', 'MΩ']} unit={f.Ru} onUnit={set('Ru')}
                hint="Empedansta direnç bileşeni. Sıfır girilebilir; negatif değer pasif bir empedansta görülmez"
              />
              <NumberField
                label="Sanal bileşen (X)"
                value={f.X} onChange={set('X')}
                units={['Ω', 'mΩ', 'kΩ', 'MΩ']} unit={f.Xu} onUnit={set('Xu')}
                hint="Reaktans. Pozitif değer endüktif, negatif değer kapasitif davranış demektir"
              />
            </>
          ) : (
            <>
              <NumberField
                label="Büyüklük (|Z|)"
                value={f.mag} onChange={set('mag')}
                units={['Ω', 'mΩ', 'kΩ', 'MΩ']} unit={f.magu} onUnit={set('magu')}
                hint="Vektörün boyu; negatif olamaz, yön bilgisi faz açısında taşınır"
              />
              <NumberField
                label="Faz açısı (φ)"
                value={f.phase} onChange={set('phase')}
                units={['°', 'rad']} unit={f.phaseu} onUnit={set('phaseu')}
                hint={`Gerçel eksenden ölçülür. Ana değer aralığı (−180°, +180°]; giriş sınırı ±${PHASE_LIMIT_DEG}°`}
              />
            </>
          )}
        </section>

        {/* ---------- Orta: Sonuç ---------- */}
        <section className="panel">
          <h2>Sonuç</h2>

          {!r.ok ? (
            r.ambiguous ? (
              <p className="empty-note warn">
                {THOUSANDS_MESSAGE} Etkilenen alan: {r.ambiguous.join(', ')}.
              </p>
            ) : (
              <p className="empty-note">{reasonText(r.reason)}</p>
            )
          ) : (
            <>
              <div className="big-result">
                <div className="label">
                  {r.mode === MODE_RECT ? 'Polar biçim' : 'Dikdörtgensel biçim'}
                </div>
                <div className="value">
                  {r.mode === MODE_RECT
                    ? polarText(r.magnitude, r.phaseDeg)
                    : rectText(r.R, r.X)}
                </div>
                <div className="alt">
                  {r.mode === MODE_RECT
                    ? <>{fmt(r.phase, 5)} rad &nbsp;·&nbsp; {KIND_LABEL[r.kind]}</>
                    : <>{polarText(r.magnitude, r.phaseDeg)} &nbsp;·&nbsp; {KIND_LABEL[r.kind]}</>}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr className="mini-head"><td>Dikdörtgensel</td><td>Z = R + jX</td></tr>
                  <tr><td>Gerçel bileşen R</td><td>{fmtOhm(r.R)}</td></tr>
                  <tr><td>Sanal bileşen X</td><td>{fmtOhm(r.X)} <span className="sub">({KIND_LABEL[r.kind]})</span></td></tr>
                  <tr><td>Yazım</td><td>{rectText(r.R, r.X)}</td></tr>

                  <tr className="mini-head"><td>Polar</td><td>Z = |Z| ∠ φ</td></tr>
                  <tr><td>Büyüklük |Z|</td><td>{fmtOhm(r.magnitude)}</td></tr>
                  <tr><td>Faz φ (derece)</td><td>{fmt(r.phaseDeg, 5)}°</td></tr>
                  <tr><td>Faz φ (radyan)</td><td>{fmt(r.phase, 5)} rad</td></tr>
                  <tr><td>Yazım</td><td>{polarText(r.magnitude, r.phaseDeg)}</td></tr>

                  <tr className="mini-head"><td>Konum</td><td>kompleks düzlem</td></tr>
                  <tr><td>Çeyrek</td><td>{QUADRANT_LABEL[r.quadrant]}</td></tr>
                  {r.wrapped && (
                    <tr>
                      <td>Girilen açı</td>
                      <td>{fmt(r.phaseEnteredDeg, 6)}° <span className="sub">(ana değere indirgendi)</span></td>
                    </tr>
                  )}
                </tbody>
              </table>

              {r.check && (
                <>
                  <h2 className="section">Ters dönüşüm kontrolü</h2>
                  <table className="result-table">
                    <tbody>
                      <tr><td>R = |Z|·cos φ</td><td>{fmtOhm(r.check.R)}</td></tr>
                      <tr><td>X = |Z|·sin φ</td><td>{fmtOhm(r.check.X)}</td></tr>
                      <tr><td>|Z| = √(R² + X²)</td><td>{fmtOhm(r.check.magnitude)}</td></tr>
                      <tr><td>φ = atan2(X, R)</td><td>{fmt(r.check.phaseDeg, 5)}°</td></tr>
                    </tbody>
                  </table>
                </>
              )}

              <h2 className="section">Mühendislik yorumu</h2>
              <ul className="commentary">
                {notes.map((n) => (
                  <li key={n.text} className={n.level}>
                    <span className="mark" aria-hidden="true">{MARK[n.level]}</span>
                    <span>{n.text}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* ---------- Sağ: Teknik detay ---------- */}
        <section className="panel panel-detail">
          <h2>Teknik detay</h2>

          <pre className="formula">{`Dikdörtgensel:
  Z = R + jX
Büyüklük:
  |Z| = √(R² + X²)
Faz:
  φ = tan⁻¹(X / R)
Polar biçim:
  Z = |Z| ∠ φ

Ters dönüşüm:
  R = |Z|·cos φ
  X = |Z|·sin φ

Derece–radyan:
  φ[°] = φ[rad]·180/π

Kodda faz DAİMA atan2(X, R)
  ile bulunur.`}</pre>

          {r.ok && (
            <ul className="detail-list">
              <li>
                Girilen biçim: {MODE_LABEL[r.mode]}. Bileşenler R = {fmtOhm(r.R)},
                X = {fmtOhm(r.X)}; büyüklük {fmtOhm(r.magnitude)}, faz {fmt(r.phaseDeg, 5)}° = {fmt(r.phase, 5)} rad.
              </li>
              <li>
                Faz açısı tan⁻¹(X/R) yerine atan2(X, R) ile hesaplanır. tan⁻¹ yalnızca
                (−90°, +90°) döndürebildiği için R &lt; 0 olan ikinci ve üçüncü çeyrekte açıyı
                180° yanlış verir ve R = 0’da sıfıra bölünür; atan2 iki bileşenin işaretini
                ayrı ayrı gördüğünden doğru çeyreği seçer.
              </li>
              <li>
                Büyüklük Math.hypot ile alınır: √(R² + X²) ile aynı sonucu verir, ancak ara
                karelerde taşma ve alt taşma üretmez.
              </li>
              <li>
                Sınıflandırmada (endüktif/kapasitif/saf dirençli) büyüklüğün 10⁻¹² katından
                küçük bileşen sayısal artık sayılır; bu eşik yalnızca sınıflandırma içindir,
                gösterilen sayılar kırpılmaz.
              </li>
              <li>Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.</li>
            </ul>
          )}

          <h2 className="section">Geçerlilik ve varsayımlar</h2>
          <ul className="detail-list">
            {r.ok && validity.map((w) => <li key={w} className="w">{w}</li>)}
            {RANGE_NOTES.map((t) => <li key={t}>{t}</li>)}
            {SOURCE_NOTES.map((t) => <li key={t}>{t}</li>)}
            <li>
              Dönüşüm cebirsel olarak tamdır; yaklaşım içermez. Sonuçtaki tek sapma çift
              duyarlıklı kayan nokta aritmetiğinden gelir.
            </li>
            <li>
              R ve X aynı frekans için geçerli fazör bileşenleridir. Reaktans frekansa bağlıdır
              (X_L = 2πfL, X_C = −1/(2πfC)); başka bir frekansta bu sayı geçerli değildir.
            </li>
            <li>
              Birim Ω olarak sunulur çünkü kullanım bağlamı empedanstır. Saf matematiksel
              dönüşüm için birim seçicileri Ω’da bırakıp değerler boyutsuz okunabilir.
            </li>
            <li>
              R = 0 ve X = 0 noktasında faz tanımsızdır ve hesap yapılmaz; atan2(0, 0) dilde
              sıfır döndürse de bu bir açı değildir.
            </li>
            <li>
              Sapma yalnızca gösterim yuvarlamasından gelir; hesap tam değerle yapılır,
              yuvarlama son adımda uygulanır.
            </li>
          </ul>
        </section>
      </div>

      {/* 3) ALT: Parametrik grafik */}
      <section className="panel panel-chart">
        <div className="chart-head">
          <h2>Parametrik grafik</h2>
          <Segmented
            value={sweep}
            onChange={setSweep}
            options={SWEEP_PARAMS.map((p) => ({ value: p, label: SWEEP_LABEL[p] }))}
          />
        </div>

        {s ? (
          <>
            <ChartLegend
              items={[
                { label: SWEEP_SERIES[s.param], tone: toneClass(0), kind: 'line' },
                ...s.refs.map((ref) => ({ label: REF_LABEL[ref.key](ref.y), tone: 'tone-muted', kind: 'line' })),
              ]}
            />

            <LineChart
              xScale="linear"
              xLabel={CHART.x}
              yLabel={SWEEP_AXIS[s.param]}
              series={chartSeries}
              refLines={s.refs.map((ref) => ({ key: ref.key, y: ref.y, label: REF_LABEL[ref.key](ref.y) }))}
              marker={s.marker ? { ...s.marker, label: 'seçilen' } : null}
              formatX={(v) => fmtOhm(v)}
              formatY={formatY}
              caption={SWEEP_CAPTION[s.param]}
            />

            <ChartDataTable
              xLabel={CHART.x}
              series={chartSeries}
              every={10}
              formatX={(v) => fmtOhm(v)}
              formatY={formatY}
            />
          </>
        ) : (
          <p className="empty-note">Grafik için geçerli girdi gerekli.</p>
        )}
      </section>

      {/* 4) GERİ BAĞLANTI */}
    </>
  )
}
