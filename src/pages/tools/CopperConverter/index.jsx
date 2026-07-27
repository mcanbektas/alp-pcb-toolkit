import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import Segmented from '../../../components/Segmented'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import useToolForm from '../../../hooks/useToolForm'
import { fmt, fmtEng, fmtOhm, THOUSANDS_MESSAGE } from '../../../lib/num'
import CopperSchematic from './schematic'
import {
  INITIAL_FORM, SOURCES, SOURCE_WEIGHT, SOURCE_THICKNESS, OZ_OPTIONS,
  compute, buildSweep,
} from './model'
import { SOURCE_LABEL, CHART, reasonText, commentary } from './text'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }

export default function CopperConverter() {
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

  const chartSeries = s ? [{ key: 'rsheet', name: 'R_□', tone: toneClass(0), points: s.points }] : []

  return (
    <>
      <div className="tool-header">
        <h1>Copper Thickness Converter</h1>
        <p>
          Bakır ağırlığı ile kalınlık arasında çevirir; nominal tablo ile yoğunluktan türetilen
          değeri karşılaştırır, kaplamayla bitmiş kalınlığı ve trapez kesit etkisini gösterir.
        </p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>Girdiler</h2>

          <CopperSchematic r={r} />

          <Segmented
            value={f.source}
            onChange={set('source')}
            options={SOURCES.map((x) => ({ value: x, label: SOURCE_LABEL[x] }))}
          />

          {f.source === SOURCE_WEIGHT ? (
            <NumberField
              label="Bakır ağırlığı"
              value={f.oz} onChange={set('oz')}
              units={['oz/ft²']} unit="oz/ft²" onUnit={() => {}}
              hint={`Nominal tabloda olanlar: ${OZ_OPTIONS.join(', ')}. Ara değerler doğrusal kuralla çevrilir.`}
            />
          ) : (
            <NumberField
              label="Başlangıç (folyo) kalınlığı"
              value={f.thickness} onChange={set('thickness')}
              units={['um', 'mm', 'mil', 'inch']} unit={f.thicknessu} onUnit={set('thicknessu')}
            />
          )}

          <SelectField
            label="Katman"
            value={f.layer} onChange={set('layer')}
            options={[
              { value: 'external', label: 'Dış katman (kaplama eklenir)' },
              { value: 'internal', label: 'İç katman (kaplama yok)' },
            ]}
          />

          <NumberField
            label="Kaplama kalınlığı"
            value={f.plating} onChange={set('plating')}
            units={['µm']} unit="µm" onUnit={() => {}}
            hint="Tipik delik kaplaması 20–30 µm; iç katmanda yok sayılır"
          />

          <NumberField
            label="Yol genişliği"
            value={f.W} onChange={set('W')}
            units={['mm', 'mil']} unit={f.Wu} onUnit={set('Wu')}
            hint="Kesit alanı ve trapez etkisi bu genişlikte hesaplanır"
          />

          <NumberField
            label="Aşındırma oranı"
            value={f.etch} onChange={set('etch')}
            units={['%']} unit="%" onUnit={() => {}}
            hint="W_üst = W_alt · (1 − E). Sıfır girilirse kesit dikdörtgen sayılır"
          />

          <NumberField
            label="Sıcaklık"
            value={f.T} onChange={set('T')}
            units={['°C']} unit="°C" onUnit={() => {}}
            hint="Kare direnci bu sıcaklığa göre düzeltilir"
          />
        </section>

        {/* ---------- Orta: Ana sonuç ---------- */}
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
                <div className="label">Bitmiş bakır kalınlığı</div>
                <div className="value">{fmt(r.units.finished.um, 4)} µm</div>
                <div className="alt">
                  {fmt(r.units.finished.mil, 4)} mil &nbsp;·&nbsp; {fmt(r.units.finished.mm, 4)} mm
                  &nbsp;·&nbsp; ≈ {fmt(r.units.finished.ozNominal, 3)} oz/ft²
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr className="mini-head">
                    <td>Kalınlık</td>
                    <td>başlangıç · bitmiş</td>
                  </tr>
                  <tr>
                    <td>µm</td>
                    <td>{fmt(r.units.starting.um, 4)} · {fmt(r.units.finished.um, 4)}</td>
                  </tr>
                  <tr>
                    <td>mm</td>
                    <td>{fmt(r.units.starting.mm, 4)} · {fmt(r.units.finished.mm, 4)}</td>
                  </tr>
                  <tr>
                    <td>mil</td>
                    <td>{fmt(r.units.starting.mil, 4)} · {fmt(r.units.finished.mil, 4)}</td>
                  </tr>
                  <tr>
                    <td>inch</td>
                    <td>{fmt(r.units.starting.inch, 4)} · {fmt(r.units.finished.inch, 4)}</td>
                  </tr>
                  <tr>
                    <td>oz/ft² (nominal)</td>
                    <td>{fmt(r.units.starting.ozNominal, 4)} · {fmt(r.units.finished.ozNominal, 4)}</td>
                  </tr>
                </tbody>
              </table>

              {r.nominal != null && (
                <>
                  <h2 className="section">Nominal ve türetilmiş</h2>
                  <table className="result-table">
                    <tbody>
                      <tr>
                        <td>Endüstri nominal tablosu</td>
                        <td>{fmt(r.nominal * 1e6, 4)} µm</td>
                      </tr>
                      <tr>
                        <td>Bakır yoğunluğundan türetilen</td>
                        <td>{fmt(r.derived * 1e6, 4)} µm</td>
                      </tr>
                      <tr>
                        <td>Fark</td>
                        <td>{fmt(((r.nominal - r.derived) / r.derived) * 100, 3)} %</td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}

              <h2 className="section">Kesit ve direnç</h2>
              <table className="result-table">
                <tbody>
                  <tr>
                    <td>Dikdörtgen kesit alanı</td>
                    <td>{fmt(r.rect.area * 1e6, 4)} mm²</td>
                  </tr>
                  <tr>
                    <td>Trapez kesit alanı</td>
                    <td>
                      {fmt(r.trap.area * 1e6, 4)} mm²{' '}
                      <span className="sub">(−{fmt(r.trap.lossPct, 3)} %)</span>
                    </td>
                  </tr>
                  <tr>
                    <td>Üst / alt genişlik</td>
                    <td>{fmtEng(r.trap.Wtop, 'm', 4)} · {fmtEng(r.trap.Wbottom, 'm', 4)}</td>
                  </tr>
                  <tr>
                    <td>Kare direnci @ {fmt(r.T, 3)} °C</td>
                    <td>{fmtOhm(r.Rsheet)}/□</td>
                  </tr>
                  <tr>
                    <td>Trapez kesitle etkin kare direnci</td>
                    <td>{fmtOhm(r.RsheetTrap)}/□</td>
                  </tr>
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

          <pre className="formula">{`Yoğunluktan kalınlık:
  m_A = 0.0283495 kg /
          0.092903 m²
      ≈ 0.30515 kg/m²
  t = m_A / ρ_m
    = 0.30515 / 8960
    ≈ 34.06 µm

Nominal tablo:
  t[µm] ≈ 35 × oz

Birim dönüşümleri:
  t[mm]  = t[µm] / 1000
  t[mil] = t[mm] / 0.0254
  t[µm]  = 25.4 × t[mil]

Kesit:
  Dikdörtgen:
    A = W·t
  Trapez:
    A = t·(W_üst + W_alt)/2
    W_üst = W_alt·(1 − E)

Kare direnci:
  R_□ = ρ(T) / t`}</pre>

          {r.ok && (
            <ul className="detail-list">
              <li>
                Kullanılan kalınlık: bitmiş {fmtEng(r.finished, 'm', 5)}
                {r.plating > 0 && <> (folyo {fmtEng(r.starting, 'm', 4)} + kaplama {fmtEng(r.plating, 'm', 4)})</>}.
              </li>
              <li>Elektriksel kesit yalnızca bakır geometrisidir; PCB kalınlığı buna eklenmez.</li>
              {r.etch > 0 && (
                <li>Aşındırma oranı %{fmt(r.etch, 3)}; kesit kaybı %{fmt(r.trap.lossPct, 3)}.</li>
              )}
              <li>Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.</li>
            </ul>
          )}

          <h2 className="section">Geçerlilik ve varsayımlar</h2>
          <ul className="detail-list">
            <li>
              Nominal tablo ile yoğunluktan türetilen değer arasındaki fark bilinçlidir; ikisi de
              gösterilir ve hesapta nominal kullanılır.
            </li>
            <li>
              Kaplama yalnızca dış katmanlara eklenir ve düzgün kalınlıkta varsayılır. Gerçekte
              kaplama dağılımı panel üzerinde değişir.
            </li>
            <li>
              Aşındırma oranı tek bir sayıyla temsil edilir. Üreticinin gerçek üst-alt genişlik
              verisi varsa o tercih edilmelidir.
            </li>
            <li>
              Kare direnci DC içindir; yüksek frekansta deri etkisi akımı yüzeye iter ve etkin
              kesiti küçültür.
            </li>
            <li>Sonuçlar yaklaşıktır — kritik tasarımlarda üretici verisi ve ölçümle doğrulayın.</li>
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
            <ChartLegend items={[{ label: 'kare direnci', tone: toneClass(0), kind: 'line' }]} />

            <LineChart
              xScale="linear"
              xLabel={CHART.x}
              yLabel={CHART.y}
              series={chartSeries}
              marker={{ ...s.marker, label: 'seçilen' }}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => fmtEng(v, '', 3)}
              caption={CHART.caption}
            />

            <ChartDataTable
              xLabel={CHART.x}
              series={chartSeries}
              every={5}
              formatX={(v) => `${fmt(v, 3)} oz`}
              formatY={(v) => `${fmtOhm(v)}/□`}
            />
          </>
        ) : (
          <p className="empty-note">Grafik için geçerli girdi gerekli.</p>
        )}
      </section>

      <Link className="backlink" to="/kategori/akim-guc-bakir">← PCB Akım, Güç ve Bakır</Link>
    </>
  )
}
