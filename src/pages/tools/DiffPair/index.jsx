import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import Segmented from '../../../components/Segmented'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import useToolForm from '../../../hooks/useToolForm'
import { fmt, fmtEng, fmtRes, fmtPct, THOUSANDS_MESSAGE } from '../../../lib/num'
import DiffPairSchematic from './schematic'
import {
  INITIAL_FORM, STRUCTURES, STRUCT_MICROSTRIP, FIXED_OPTIONS, FIX_WIDTH, FIX_SPACING,
  MODE_ANALYSIS, MODE_SYNTHESIS, compute, buildSweep,
} from './model'
import {
  STRUCT_LABEL, FIXED_LABEL, METHOD_NOTE, COUPLING_SOURCE_NOTE,
  CHART_SPACING, CHART_WIDTH, reasonText, commentary,
} from './text'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }
const DIM_UNITS = ['mm', 'um', 'mil']

const FORMULA = `Tek uçlu Z₀ — kapalı form, spec §6.4/§6.6:
  microstrip → Hammerstad–Jensen
  stripline  → eliptik integral

Kuplaj katsayısı — AMPİRİK, spec'te YOK:
  microstrip: k_c = 0.48·exp(−0.96·S/H)
  stripline:  k_c = 0.347·exp(−2.9·S/b)

  Z_odd  = Z₀·(1 − k_c)
  Z_even = Z₀·(1 + k_c)

Spec §6.8.1'in istediği rota — UYGULANMADI:
  C_odd  = C₁₁ − C₁₂
  C_even = C₁₁ + C₁₂
  Z_odd  = 1 / (c·√(C_odd·C₀,odd))
  Z_even = 1 / (c·√(C_even·C₀,even))
  C₁₁, C₁₂ için kapalı form yok;
  kapasitans matrisi alan çözücüden çıkar.

Türetilenler spec'e uygun (§6.8.1, §16.4):
  Z_diff   = 2·Z_odd
  Z_common = Z_even / 2`

export default function DiffPair() {
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

  const chartMeta = s ? (s.sweepSpacing ? CHART_SPACING : CHART_WIDTH) : null
  const chartSeries = s
    ? [
        { key: 'zdiff', name: 'Z_diff', tone: toneClass(0), points: s.points },
        { key: 'zodd', name: 'Z_odd', tone: toneClass(1), points: s.oddPoints },
      ]
    : []

  return (
    <>
      <div className="tool-header">
        <h1>Differential Pair Impedance</h1>
        <p>
          Kenar bağlı diferansiyel çift için odd, even, diferansiyel ve common mod empedanslarını
          hesaplar; hedef diferansiyel empedans için hat aralığını veya genişliğini bulur.
        </p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>Girdiler</h2>

          <DiffPairSchematic r={r} form={f} />

          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: MODE_ANALYSIS, label: 'Analiz — empedansı bul' },
              { value: MODE_SYNTHESIS, label: 'Sentez — geometriyi bul' },
            ]}
          />

          <SelectField
            label="Yapı"
            value={f.structure} onChange={set('structure')}
            options={STRUCTURES.map((x) => ({ value: x, label: STRUCT_LABEL[x] }))}
          />

          {mode === MODE_SYNTHESIS && (
            <>
              <SelectField
                label="Neyi sabitliyorsunuz"
                value={f.fixed} onChange={set('fixed')}
                options={FIXED_OPTIONS.map((x) => ({ value: x, label: FIXED_LABEL[x] }))}
              />
              <NumberField
                label="Hedef diferansiyel empedans"
                value={f.target} onChange={set('target')}
                units={['Ω']} unit="Ω" onUnit={() => {}}
                hint="Tipik hedefler: 90 Ω, 100 Ω, 120 Ω"
              />
              <NumberField
                label="İzin verilen sapma"
                value={f.tolerancePct} onChange={set('tolerancePct')}
                units={['%']} unit="%" onUnit={() => {}}
              />
            </>
          )}

          {(mode === MODE_ANALYSIS || f.fixed === FIX_WIDTH) && (
            <NumberField
              label={mode === MODE_SYNTHESIS ? 'Sabit hat genişliği (W)' : 'Hat genişliği (W)'}
              value={f.W} onChange={set('W')}
              units={DIM_UNITS} unit={f.Wu} onUnit={set('Wu')}
            />
          )}

          {(mode === MODE_ANALYSIS || f.fixed === FIX_SPACING) && (
            <NumberField
              label={mode === MODE_SYNTHESIS ? 'Sabit hat aralığı (S)' : 'Hatlar arası boşluk (S)'}
              value={f.S} onChange={set('S')}
              units={DIM_UNITS} unit={f.Su} onUnit={set('Su')}
              hint="Kenar-kenar mesafe"
            />
          )}

          <NumberField
            label={f.structure === STRUCT_MICROSTRIP
              ? 'Dielektrik yüksekliği (H)'
              : 'Düzlemler arası mesafe (b)'}
            value={f.H} onChange={set('H')}
            units={DIM_UNITS} unit={f.Hu} onUnit={set('Hu')}
          />

          <NumberField
            label="Bakır kalınlığı (t)"
            value={f.t} onChange={set('t')}
            units={DIM_UNITS} unit={f.tu} onUnit={set('tu')}
          />

          <NumberField
            label="Dielektrik sabiti (εr)"
            value={f.epsR} onChange={set('epsR')}
            units={['']} unit="" onUnit={() => {}}
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
                <div className="label">
                  {r.mode === MODE_SYNTHESIS
                    ? r.solvedFor === 'S' ? 'Gereken hat aralığı' : 'Gereken hat genişliği'
                    : 'Diferansiyel empedans'}
                </div>
                <div className="value">
                  {r.mode === MODE_SYNTHESIS
                    ? fmtEng(r.solvedFor === 'S' ? r.S : r.W, 'm', 4)
                    : fmtRes(r.Zdiff, 4)}
                </div>
                <div className="alt">
                  {r.mode === MODE_SYNTHESIS
                    ? <>Z_diff = {fmtRes(r.Zdiff, 4)} &nbsp;·&nbsp; hedef {fmtRes(r.target, 3)} ({fmtPct(r.errPct)})</>
                    : <>Z_odd = {fmtRes(r.Zodd, 4)} &nbsp;·&nbsp; tek uçlu Z₀ = {fmtRes(r.Z0, 4)}</>}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <p className="method-note">{METHOD_NOTE}</p>
              <p className="method-note">{COUPLING_SOURCE_NOTE}</p>

              <table className="result-table">
                <tbody>
                  <tr>
                    <td>Diferansiyel empedans (Z_diff)</td>
                    <td>{fmtRes(r.Zdiff, 5)}</td>
                  </tr>
                  <tr>
                    <td>Odd mod (Z_odd)</td>
                    <td>{fmtRes(r.Zodd, 5)}</td>
                  </tr>
                  <tr>
                    <td>Even mod (Z_even)</td>
                    <td>{fmtRes(r.Zeven, 5)}</td>
                  </tr>
                  <tr>
                    <td>Common mod (Z_common)</td>
                    <td>{fmtRes(r.Zcommon, 5)}</td>
                  </tr>
                  <tr>
                    <td>Tek uçlu empedans (Z₀)</td>
                    <td>{fmtRes(r.Z0, 5)}</td>
                  </tr>
                  <tr>
                    <td>2 × Z₀ (yanlış yaklaşım)</td>
                    <td>{fmtRes(2 * r.Z0, 5)}</td>
                  </tr>
                  <tr>
                    <td>Kuplaj katsayısı</td>
                    <td>{fmt(r.coupling, 5)}</td>
                  </tr>
                  <tr>
                    <td>S / H oranı</td>
                    <td>{fmt(r.ratio, 4)}</td>
                  </tr>
                  <tr>
                    <td>Efektif dielektrik sabiti</td>
                    <td>{fmt(r.epsEff, 5)}</td>
                  </tr>
                  <tr>
                    <td>Yayılma gecikmesi</td>
                    <td>{fmt(r.tpdPsPerMm, 4)} ps/mm</td>
                  </tr>
                  <tr>
                    <td>Hat genişliği / aralık</td>
                    <td>{fmtEng(r.W, 'm', 4)} · {fmtEng(r.S, 'm', 4)}</td>
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

          <pre className="formula">{FORMULA}</pre>

          {r.ok && (
            <ul className="detail-list">
              <li>
                Model: {r.model}. Çiftin yöntem alanı `{r.method}`, tek uçlu formunki
                `{r.singleMethod}` — ikisi aynı güven seviyesinde değildir.
              </li>
              <li>Kapasitans matrisi rotası (spec §6.8.1) uygulandı mı: hayır.</li>
              <li>Kuplaj katsayısı {fmt(r.coupling, 5)}; S/H = {fmt(r.ratio, 4)}.</li>
              {r.mode === MODE_SYNTHESIS && (
                <li>
                  {r.solvedFor === 'S' ? 'Aralık' : 'Genişlik'} {r.solvedBy} yöntemiyle, fiziksel
                  sınırlar içinde çözüldü.
                </li>
              )}
              <li>
                Tek bir hedef empedans hem W hem S bilinmiyorsa sonsuz çözüm üretir; bu yüzden
                biri sabitlenir (spec §6.8.2).
              </li>
              <li>Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.</li>
            </ul>
          )}

          <h2 className="section">Geçerlilik ve varsayımlar</h2>
          <ul className="detail-list">
            <li>
              <strong>Bilinen sapma:</strong> kuplaj katsayısının kaynağı docs/spec.md'de yok.
              Sayısal katsayıları ve geçerlilik aralığı spec'ten doğrulanamıyor; sonuç bu
              nedenle kapalı form sonuçlarıyla aynı kefeye konmaz. Alan çözücü fazında §6.8.1
              kapasitans matrisi rotasıyla değiştirilecektir.
            </li>
            <li>
              Yaklaşım simetrik çift ve zayıf-orta kuplaj içindir; S/H ≥ 0.2 civarında
              güvenilirdir, çok sıkı kuplajda sapar.
            </li>
            <li>
              Bu ekranın Z_diff değeriyle üretim kararı verilmemelidir. Yığın onayı, panel
              çıkışı ve empedans kontrol kuponu için alan çözücü sonucu veya üretici ölçümü
              gerekir.
            </li>
            <li>Asimetrik diferansiyel stripline ve coplanar diferansiyel çift bu fazda yoktur.</li>
            <li>
              Microstrip'te odd ve even mod hızları farklıdır; bu fark mod dönüşümü ve far-end
              crosstalk üretir. Bu ekran tek bir εeff kullandığı için iki modu aynı hızda kabul
              eder — modal hız farkı, dolayısıyla far-end crosstalk, buradaki sonuçtan
              türetilemez. Crosstalk ekranı bu değerleri ayrıca ister.
            </li>
            <li>
              Protokol presetleri yalnızca form alanlarını doldurur; sonuç protokole uygunluk
              iddiası taşımaz.
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
                { label: 'Z_diff', tone: toneClass(0), kind: 'line' },
                { label: 'Z_odd', tone: toneClass(1), kind: 'line' },
                ...s.refs.map(() => ({ label: 'hedef', tone: 'tone-muted', kind: 'line' })),
              ]}
            />

            <LineChart
              xScale="log"
              xLabel={chartMeta.x}
              yLabel={chartMeta.y}
              series={chartSeries}
              refLines={s.refs.map((ref) => ({ key: ref.key, y: ref.y, label: `hedef ${fmtRes(ref.y, 3)}` }))}
              marker={{ ...s.marker, label: 'çalışma noktası' }}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => fmt(v, 3)}
              caption={chartMeta.caption}
            />

            <ChartDataTable
              xLabel={chartMeta.x}
              series={chartSeries}
              every={6}
              formatX={(v) => `${fmt(v, 4)} mm`}
              formatY={(v) => fmtRes(v, 4)}
            />
          </>
        ) : (
          <p className="empty-note">Grafik için geçerli girdi gerekli.</p>
        )}
      </section>

      <Link className="backlink" to="/kategori/empedans">← Kontrollü Empedans</Link>
    </>
  )
}
