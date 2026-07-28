import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import useToolForm from '../../../hooks/useToolForm'
import { fmt, fmtEng, THOUSANDS_MESSAGE } from '../../../lib/num'
import LengthSchematic from './schematic'
import { INITIAL_FORM, UNITS, SIG_VALUES, compute, buildSweep } from './model'
import {
  UNIT_LABEL, UNIT_ROW, SIG_LABEL, CHART, RANGE_NOTES, SOURCE_NOTES,
  reasonText, commentary,
} from './text'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }

export default function LengthConverter() {
  const { f, set } = useToolForm(INITIAL_FORM)

  const r = useMemo(() => compute(f), [f])
  const s = useMemo(() => buildSweep(r), [r])
  const notes = useMemo(() => commentary(r), [r])

  const status = useMemo(() => {
    if (!r.ok || notes.length === 0) return null
    const worst = notes.reduce((acc, n) => (LEVEL_RANK[n.level] > LEVEL_RANK[acc] ? n.level : acc), 'ok')
    const count = notes.filter((n) => n.level === worst).length
    if (worst === 'ok') return { cls: 'ok', text: 'Tüm kontroller geçti' }
    if (worst === 'warn') return { cls: 'warn', text: `Sınıra yakın — ${count} uyarı` }
    return { cls: 'danger', text: `${count} kontrol sınırın dışında` }
  }, [r, notes])

  const chartSeries = s ? [{ key: 'mil', name: 'mil', tone: toneClass(0), points: s.points }] : []

  return (
    <>
      <Link className="backlink" to="/kategori/uretim-dfm">← PCB Üretim, DFM ve Dönüşümler</Link>

      <div className="tool-header">
        <h1>Length Converter</h1>
        <p>
          PCB tasarımında sık karşılaşılan mm, µm, mil, inch, cm ve m birimleri arasında çift yönlü
          dönüşüm yapar; girilen uzunluğun tüm birimlerdeki karşılığını birlikte gösterir ve
          yuvarlatılmış 39.3701 kuralının nerede görünür hale geldiğini işaretler.
        </p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>Girdiler</h2>

          <LengthSchematic r={r} />

          <NumberField
            label="Uzunluk"
            value={f.L} onChange={set('L')}
            units={UNITS} unit={f.Lu} onUnit={set('Lu')}
            hint="Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25)"
          />

          <SelectField
            label="Hedef birim"
            value={f.target} onChange={set('target')}
            options={UNITS.map((u) => ({ value: u, label: UNIT_LABEL[u] }))}
            hint="Ana sonuçta bu birim gösterilir; tablo yine tüm birimleri verir"
          />

          <SelectField
            label="Gösterim hassasiyeti"
            value={f.sig} onChange={set('sig')}
            options={SIG_VALUES.map((n) => ({ value: String(n), label: SIG_LABEL(n) }))}
            hint="Yalnızca gösterimi etkiler; hesap tam değerlerle yapılır"
          />
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
                <div className="label">{UNIT_ROW[r.target]} karşılığı</div>
                <div className="value">{fmt(r.targetValue, r.sig)} {r.target}</div>
                <div className="alt">
                  {fmt(r.all.mm, r.sig)} mm &nbsp;·&nbsp; {fmt(r.all.mil, r.sig)} mil
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr className="mini-head"><td>Kart ölçüleri</td><td>mm · µm · mil</td></tr>
                  <tr>
                    <td>{UNIT_ROW.mm}</td>
                    <td>
                      {fmt(r.all.mm, r.sig)} mm
                      {r.target === 'mm' && <span className="sub"> (hedef)</span>}
                    </td>
                  </tr>
                  <tr>
                    <td>{UNIT_ROW['µm']}</td>
                    <td>
                      {fmt(r.all.um, r.sig)} µm
                      {r.target === 'µm' && <span className="sub"> (hedef)</span>}
                    </td>
                  </tr>
                  <tr>
                    <td>{UNIT_ROW.mil}</td>
                    <td>
                      {fmt(r.all.mil, r.sig)} mil
                      {r.target === 'mil' && <span className="sub"> (hedef)</span>}
                    </td>
                  </tr>

                  <tr className="mini-head"><td>Diğer birimler</td><td>inch · cm · m</td></tr>
                  <tr>
                    <td>{UNIT_ROW.inch}</td>
                    <td>
                      {fmt(r.all.inch, r.sig)} inch
                      {r.target === 'inch' && <span className="sub"> (hedef)</span>}
                    </td>
                  </tr>
                  <tr>
                    <td>{UNIT_ROW.cm}</td>
                    <td>
                      {fmt(r.all.cm, r.sig)} cm
                      {r.target === 'cm' && <span className="sub"> (hedef)</span>}
                    </td>
                  </tr>
                  <tr>
                    <td>{UNIT_ROW.m}</td>
                    <td>
                      {fmt(r.all.m, r.sig)} m
                      {r.target === 'm' && <span className="sub"> (hedef)</span>}
                    </td>
                  </tr>
                </tbody>
              </table>

              <h2 className="section">Sık kullanılan mil ölçüleri</h2>
              <table className="result-table">
                <tbody>
                  <tr className="mini-head"><td>mil</td><td>mm karşılığı</td></tr>
                  {r.common.map((c, i) => (
                    <tr key={c.mil}>
                      <td>{c.mil} mil</td>
                      <td>
                        {fmt(c.mm, 4)} mm
                        {i === r.nearest && <span className="sub"> (girilen değere en yakın)</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

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

          <pre className="formula">{`Tanım gereği tam:
  1 inch = 25.4 mm
  1 mil = 0.001 inch = 0.0254 mm
  1 µm = 0.001 mm

Dönüşüm daima SI (metre)
üzerinden yapılır:
  L[m] =
    değer × çarpan[kaynak birim]
  sonuç =
    L[m] / çarpan[hedef birim]

mm → mil:
  mil = mm / 0.0254
      = mm × 39.370078740157…

Gösterim değeri:
  1 mm ≈ 39.3701 mil
  (yuvarlatılmış, hesapta
   KULLANILMAZ)`}</pre>

          {r.ok && (
            <ul className="detail-list">
              <li>Girilen uzunluğun SI karşılığı: {fmtEng(r.L, 'm', r.sig)}.</li>
              <li>
                Hesapta 1/0.0254 = 39.370078740157… kullanılır. Kaynaklarda sık yazılan 39.3701
                dört ondalığa yuvarlatılmış gösterim değeridir; onunla çarpmak sonucu milyonda
                {' '}{fmt(r.rounding.relPct * 1e4, 3)} kadar büyütür.
              </li>
              <li>
                Bu uzunluk için tam kural {fmt(r.rounding.exact, r.sig)} mil, yuvarlatılmış kural
                {' '}{fmt(r.rounding.rounded, r.sig)} mil verir; fark {fmt(r.rounding.diff, 3)} mil.
              </li>
              <li>Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.</li>
            </ul>
          )}

          <h2 className="section">Geçerlilik ve varsayımlar</h2>
          <ul className="detail-list">
            {RANGE_NOTES.map((t) => <li key={t}>{t}</li>)}
            {SOURCE_NOTES.map((t) => <li key={t}>{t}</li>)}
            <li>
              Ekran yalnızca sayı çevirir: üretim ızgarasına yuvarlama, üreticinin en küçük
              yol/aralık sınırı ve kalıp toleransı burada dikkate alınmaz.
            </li>
            <li>
              Gösterim hassasiyeti seçimi sonucu değil yalnızca yazımı etkiler; kopyaladığınız
              değerin basamak sayısına dikkat edin.
            </li>
            <li>
              Sonuç yaklaşık değildir: dönüşüm tanım gereği tamdır ve sapma yalnızca gösterim
              yuvarlamasından gelir.
            </li>
          </ul>
        </section>
      </div>

      {/* ---------- Alt: Parametrik grafik ---------- */}
      <section className="panel panel-chart">
        <div className="chart-head">
          <h2>Parametrik grafik</h2>
        </div>

        {s ? (
          <>
            <ChartLegend items={[{ label: 'mil karşılığı', tone: toneClass(0), kind: 'line' }]} />

            <LineChart
              xScale="linear"
              xLabel={CHART.x}
              yLabel={CHART.y}
              series={chartSeries}
              marker={{ ...s.marker, label: 'seçilen' }}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => fmt(v, 3)}
              caption={CHART.caption}
            />

            <ChartDataTable
              xLabel={CHART.x}
              series={chartSeries}
              every={5}
              formatX={(v) => `${fmt(v, 3)} mm`}
              formatY={(v) => `${fmt(v, 3)} mil`}
            />
          </>
        ) : (
          <p className="empty-note">Grafik için geçerli girdi gerekli.</p>
        )}
      </section>

    </>
  )
}
