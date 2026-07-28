import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import TextField from '../../../components/TextField'
import Segmented from '../../../components/Segmented'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import useToolForm from '../../../hooks/useToolForm'
import { fmt, fmtRes, fmtPct, THOUSANDS_MESSAGE } from '../../../lib/num'
import CodeSchematic from './schematic'
import {
  INITIAL_FORM, MODE_ANALYSIS, MODE_SYNTHESIS,
  KIND_COLOR, KIND_SMD, KIND_CAP, KINDS, BAND_COUNTS,
  compute, buildSweep, bandRoles,
} from './model'
import {
  COLOR_NAME, KIND_LABEL, ROLE_LABEL, SMD_KIND_LABEL, CHART_CAPTION, reasonText, commentary,
} from './text'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }

export default function ResistorCode() {
  const [mode, setMode] = useState(MODE_ANALYSIS)
  const { f, set } = useToolForm(INITIAL_FORM)

  const r = useMemo(() => compute(mode, f), [mode, f])
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

  const roles = bandRoles(Number(f.bandCount))
  const chartSeries = s ? [{ key: 'rt', name: 'R(T)', tone: toneClass(0), points: s.points }] : []

  return (
    <>
      <Link className="backlink" to="/kategori/komponent">← Komponent ve Devre Hesapları</Link>

      <div className="tool-header">
        <h1>Resistor &amp; SMD Code Decoder</h1>
        <p>
          Renk bantlarını, SMD direnç kodlarını ve seramik kondansatör kodlarını çözer; değerden
          renk bandına ters çevirme, tolerans penceresi, en yakın E serisi değeri ve sıcaklık
          kaymasını birlikte verir.
        </p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>Girdiler</h2>

          <CodeSchematic r={r} form={f} />

          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: MODE_ANALYSIS, label: 'Analiz — koddan değere' },
              { value: MODE_SYNTHESIS, label: 'Sentez — değerden koda' },
            ]}
          />

          <SelectField
            label="Komponent işareti"
            value={f.kind} onChange={set('kind')}
            options={KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))}
          />

          {(f.kind === KIND_COLOR || mode === MODE_SYNTHESIS) && (
            <SelectField
              label="Bant sayısı"
              value={f.bandCount} onChange={set('bandCount')}
              options={BAND_COUNTS.map((n) => ({ value: String(n), label: `${n} bant` }))}
            />
          )}

          {mode === MODE_SYNTHESIS ? (
            <>
              <NumberField
                label="Hedef direnç"
                value={f.target} onChange={set('target')}
                units={['Ω', 'kΩ', 'MΩ']} unit={f.targetUnit} onUnit={set('targetUnit')}
              />
              <NumberField
                label="Tolerans"
                value={f.tolerance} onChange={set('tolerance')}
                units={['%']} unit="%" onUnit={() => {}}
                hint="Renklerle gösterilebilen değerler: 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10"
              />
              {f.bandCount === '6' && (
                <NumberField
                  label="Sıcaklık katsayısı (TCR)"
                  value={f.tcr} onChange={set('tcr')}
                  units={['ppm/°C']} unit="ppm/°C" onUnit={() => {}}
                  hint="Renklerle gösterilebilenler: 5, 10, 15, 25, 50, 100"
                />
              )}
            </>
          ) : f.kind === KIND_COLOR ? (
            roles.map((role) => (
              <SelectField
                key={role.index}
                label={ROLE_LABEL[role.role](role.index)}
                value={f[`b${role.index}`]} onChange={set(`b${role.index}`)}
                options={role.options.map((c) => ({ value: c.key, label: COLOR_NAME[c.key] }))}
              />
            ))
          ) : f.kind === KIND_SMD ? (
            <>
              <TextField
                label="SMD kodu"
                value={f.smd} onChange={set('smd')}
                hint="472 · 4701 · 4R7 · R22 · 01A · 0"
              />
              <SelectField
                label="Kod profili"
                value={f.smdProfile} onChange={set('smdProfile')}
                options={[
                  { value: 'standard', label: 'Standart EIA-96' },
                  { value: 'manufacturer', label: 'Üretici profili (alias harfleri dahil)' },
                ]}
              />
            </>
          ) : (
            <TextField
              label="Kondansatör kodu"
              value={f.cap} onChange={set('cap')}
              hint="Üç rakam ve opsiyonel tolerans harfi: 104 · 104K · 223J"
            />
          )}

          <NumberField
            label="Değerlendirme sıcaklığı"
            value={f.Tref} onChange={set('Tref')}
            units={['°C']} unit="°C" onUnit={() => {}}
            hint="Sıcaklık kayması bu noktada hesaplanır"
          />
          <NumberField
            label="Grafik alt sıcaklık"
            value={f.Tmin} onChange={set('Tmin')}
            units={['°C']} unit="°C" onUnit={() => {}}
          />
          <NumberField
            label="Grafik üst sıcaklık"
            value={f.Tmax} onChange={set('Tmax')}
            units={['°C']} unit="°C" onUnit={() => {}}
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
              <p className="empty-note">{reasonText(r.reason, r.message)}</p>
            )
          ) : (
            <>
              <div className="big-result">
                <div className="label">
                  {r.kind === KIND_CAP ? 'Kapasite' : r.mode === MODE_SYNTHESIS ? 'Gösterilebilen değer' : 'Direnç'}
                </div>
                <div className="value">
                  {r.kind === KIND_CAP ? `${fmt(r.nF, 4)} nF` : fmtRes(r.ohms, 4)}
                </div>
                <div className="alt">
                  {r.kind === KIND_CAP
                    ? `${fmt(r.pF, 4)} pF · ${fmt(r.uF, 4)} µF`
                    : r.tolerance != null
                      ? `±${fmt(r.tolerance, 3)} % → ${fmtRes(r.min, 4)} … ${fmtRes(r.max, 4)}`
                      : 'tolerans kodda belirtilmemiş'}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              {r.mode === MODE_SYNTHESIS && (
                <table className="result-table">
                  <tbody>
                    <tr>
                      <td>Bantlar (soldan sağa)</td>
                      <td>{r.bands.map((b) => COLOR_NAME[b]).join(' · ')}</td>
                    </tr>
                    <tr>
                      <td>İstenen değer</td>
                      <td>{fmtRes(r.requested, 4)}</td>
                    </tr>
                    <tr>
                      <td>Gösterilebilen değer</td>
                      <td>{fmtRes(r.ohms, 4)} {r.exact ? '' : <span className="sub">(en yakın)</span>}</td>
                    </tr>
                  </tbody>
                </table>
              )}

              {r.kind !== KIND_CAP && (
                <table className="result-table">
                  <tbody>
                    {r.mode === MODE_ANALYSIS && r.kind === KIND_COLOR && (
                      <tr>
                        <td>Bantlar (soldan sağa)</td>
                        <td>{r.bands.map((b) => COLOR_NAME[b]).join(' · ')}</td>
                      </tr>
                    )}
                    {r.kind === KIND_SMD && (
                      <tr>
                        <td>Kod türü</td>
                        <td>{SMD_KIND_LABEL[r.smdKind] ?? r.smdKind}</td>
                      </tr>
                    )}
                    {r.kind === KIND_SMD && r.base != null && (
                      <tr>
                        <td>E96 temel değeri × çarpan</td>
                        <td>{r.base} × {fmt(r.multiplier, 4)}</td>
                      </tr>
                    )}
                    <tr>
                      <td>En yakın E24</td>
                      <td>
                        {fmtRes(r.nearestE24.value, 4)}{' '}
                        <span className="sub">({fmtPct(r.nearestE24.errorPct)})</span>
                      </td>
                    </tr>
                    <tr>
                      <td>En yakın E96</td>
                      <td>
                        {fmtRes(r.nearestE96.value, 4)}{' '}
                        <span className="sub">({fmtPct(r.nearestE96.errorPct)})</span>
                      </td>
                    </tr>
                    {r.tcr != null && (
                      <>
                        <tr>
                          <td>Sıcaklık katsayısı</td>
                          <td>{fmt(r.tcr, 3)} ppm/°C</td>
                        </tr>
                        <tr>
                          <td>Direnç @ {fmt(r.temps.Tref, 3)} °C</td>
                          <td>
                            {fmtRes(r.atTref, 4)} <span className="sub">({fmtPct(r.driftPct)})</span>
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              )}

              {r.kind === KIND_CAP && (
                <table className="result-table">
                  <tbody>
                    <tr>
                      <td>pF</td>
                      <td>{fmt(r.pF, 6)}</td>
                    </tr>
                    <tr>
                      <td>nF</td>
                      <td>{fmt(r.nF, 6)}</td>
                    </tr>
                    <tr>
                      <td>µF</td>
                      <td>{fmt(r.uF, 6)}</td>
                    </tr>
                    {r.tolerance != null && (
                      <tr>
                        <td>Tolerans ({r.toleranceLetter})</td>
                        <td>±{fmt(r.tolerance, 3)} %</td>
                      </tr>
                    )}
                  </tbody>
                </table>
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

          <pre className="formula">{`4 bant:
  R = (10·D₁ + D₂) · 10^M
5 bant:
  R = (100·D₁ + 10·D₂ + D₃) · 10^M
6. bant:
  R(T) = R₂₅ ·
    [1 + TCR·10⁻⁶·(T − 25)]

SMD 3 hane:
  R = (10·D₁ + D₂) · 10^D₃
SMD 4 hane:
  R = (100·D₁ + 10·D₂ + D₃) ·
    10^D₄
R işareti:
  4R7 = 4.7 Ω, R22 = 0.22 Ω
EIA-96:
  R = E96[kod] × M[harf]

Kondansatör:
  C[pF] = (10·D₁ + D₂) · 10^D₃

Tolerans sınırları:
  R_min = R·(1 − Tol/100)
  R_max = R·(1 + Tol/100)`}</pre>

          {r.ok && r.kind !== KIND_CAP && (
            <ul className="detail-list">
              <li>Çözülen nominal değer: {fmtRes(r.ohms, 6)}.</li>
              {r.tolerance != null && (
                <li>Tolerans penceresi: {fmtRes(r.min, 6)} … {fmtRes(r.max, 6)}.</li>
              )}
              {r.tcr != null && (
                <li>
                  Sıcaklık kayması 25 °C referansına göre hesaplanır; {fmt(r.temps.Tref, 3)} °C'de
                  {' '}{fmtPct(r.driftPct)}.
                </li>
              )}
              <li>Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.</li>
            </ul>
          )}

          <h2 className="section">Geçerlilik ve varsayımlar</h2>
          <ul className="detail-list">
            <li>
              Bant renkleri ve SMD kod düzenleri endüstride yaygın kabul görmüş biçimlerdir; bazı
              üreticiler farklı çarpan harfi veya bant düzeni kullanır.
            </li>
            <li>
              EIA-96 alias harfleri (R, S, H) yalnızca üretici profili seçildiğinde kabul edilir.
              Standart profilde bilinmeyen harf hata verir — sessizce tahmin edilmez.
            </li>
            <li>
              Sıcaklık modeli doğrusaldır. Gerçek TCR sıcaklıkla değişir ve üretici eğrisi
              doğrusaldan sapar.
            </li>
            <li>
              Tolerans ve sıcaklık kayması bağımsız etkilerdir; worst-case toplam hata ikisinin
              birleşimidir, tek başına hiçbiri değildir.
            </li>
            <li>
              Tantal ve polimer kondansatör işaretleri üreticiye göre değişir; bu araç yalnızca
              üç rakamlı seramik kodunu çözer.
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
            <ChartLegend
              items={[
                { label: 'R(T)', tone: toneClass(0), kind: 'line' },
                ...s.refs.map((ref) => ({
                  label: ref.key === 'min' ? 'tolerans alt sınırı' : 'tolerans üst sınırı',
                  tone: 'tone-muted',
                  kind: 'line',
                })),
              ]}
            />

            <LineChart
              xScale="linear"
              xLabel="Sıcaklık (°C)"
              yLabel="Direnç (Ω)"
              series={chartSeries}
              refLines={s.refs.map((ref) => ({
                key: ref.key,
                y: ref.y,
                label: ref.key === 'min' ? `alt sınır ${fmtRes(ref.y, 4)}` : `üst sınır ${fmtRes(ref.y, 4)}`,
              }))}
              marker={{ ...s.marker, label: `${fmt(r.temps.Tref, 3)} °C` }}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => fmt(v, 4)}
              caption={CHART_CAPTION}
            />

            <ChartDataTable
              xLabel="Sıcaklık (°C)"
              series={chartSeries}
              every={5}
              formatX={(v) => `${fmt(v, 3)} °C`}
              formatY={(v) => fmtRes(v, 5)}
            />
          </>
        ) : (
          <p className="empty-note">
            Sıcaklık eğrisi yalnızca sıcaklık katsayısı bilindiğinde çizilir. 6 bantlı direnç seçin
            veya sentez modunda TCR girin.
          </p>
        )}
      </section>

    </>
  )
}
