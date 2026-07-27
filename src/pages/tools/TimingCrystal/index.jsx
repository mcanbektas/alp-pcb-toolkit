import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import Segmented from '../../../components/Segmented'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import useToolForm from '../../../hooks/useToolForm'
import { fmt, fmtEng, fmtRes, fmtAmp, fmtVolt, fmtPct, THOUSANDS_MESSAGE } from '../../../lib/num'
import TimingSchematic from './schematic'
import {
  INITIAL_FORM, TOOLS, TOOL_RC, TOOL_RL, TOOL_CRYSTAL,
  MODE_ANALYSIS, MODE_SYNTHESIS,
  compute, buildSweep,
} from './model'
import { TOOL_LABEL, MODE_LABEL, CHART, reasonText, commentary } from './text'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }

const FORMULA = {
  [TOOL_RC]: `τ = R·C

Şarj:
  V_C(t) = V_s·(1 − e^(−t/τ))
Deşarj:
  V_C(t) = V₀·e^(−t/τ)

%10 → %90 yükselme:
  t_r = τ·ln(9) ≈ 2.2·τ
1τ: %63.2   3τ: %95.0   5τ: %99.3`,
  [TOOL_RL]: `τ = L / R

Akım yükselmesi:
  I(t) = (V/R)·(1 − e^(−t·R/L))

%10 → %90 yükselme:
  t_r = τ·ln(9) ≈ 2.2·τ
1τ: %63.2   3τ: %95.0   5τ: %99.3`,
  [TOOL_CRYSTAL]: `Genel:
  C_L =
    (C_IN + C1)(C_OUT + C2)
    ──────────────────── + C_stray
    C_IN + C1 + C_OUT + C2

C1 = C2 = C ve giriş
kapasiteleri ihmal edilirse:
  C_L = C/2 + C_stray
  C = 2·(C_L − C_stray)`,
}

const ASSUMPTIONS = {
  [TOOL_RC]: [
    'Kaynak iç direnci sıfır, kondansatör ideal kabul edilir.',
    'Kaçak akım ve dielektrik soğurma modelde yoktur; uzun zaman sabitlerinde gerçek davranış sapar.',
    'Yükleme etkisi yoktur — çıkışa bağlanan devre zaman sabitini değiştirir.',
  ],
  [TOOL_RL]: [
    'Bobin ideal kabul edilir: sargı direnci ve öz kapasite modelde yoktur.',
    'Sargı direnci gerçek zaman sabitini kısaltır ve son akımı düşürür.',
    'Çekirdek doyması dikkate alınmaz; doyan bobinde endüktans düşer.',
  ],
  [TOOL_CRYSTAL]: [
    'C1 ve C2 kollarının simetrik olduğu varsayılır.',
    'Parazitik kapasite tek bir sayıyla temsil edilir; gerçekte iz geometrisine bağlıdır.',
    'Osilatörün negatif direnç marjı bu hesapta yoktur — yük kapasitesi doğru olsa da sürücü gücü yetersiz kalabilir.',
    'Kristalin çekme duyarlılığı (ppm/pF) üreticiye göre değişir; frekans kayması burada sayısallaştırılmaz.',
  ],
}

export default function TimingCrystal() {
  const [mode, setMode] = useState(MODE_ANALYSIS)
  const { f, set } = useToolForm(INITIAL_FORM)

  const r = useMemo(() => compute(f.tool, mode, f), [f, mode])
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

  const isTiming = f.tool === TOOL_RC || f.tool === TOOL_RL
  const chartMeta = s ? CHART[s.kind] : null
  const chartSeries = s
    ? [
        {
          key: 'main',
          name: s.kind === TOOL_RC ? 'şarj' : s.kind === TOOL_RL ? 'akım' : 'C_L',
          tone: toneClass(0),
          points: s.points,
        },
        ...(s.dischargePoints
          ? [{ key: 'discharge', name: 'deşarj', tone: toneClass(1), points: s.dischargePoints }]
          : []),
      ]
    : []

  return (
    <>
      <div className="tool-header">
        <h1>RC/RL Zaman Sabiti &amp; Kristal</h1>
        <p>
          RC ve RL zaman sabitlerini, yükselme sürelerini ve şarj/deşarj eğrilerini; kristal
          osilatörler için gerekli yük kapasitörlerini hesaplar.
        </p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>Girdiler</h2>

          <TimingSchematic r={r} form={f} />

          <SelectField
            label="Hesap"
            value={f.tool} onChange={set('tool')}
            options={TOOLS.map((t) => ({ value: t, label: TOOL_LABEL[t] }))}
          />

          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: MODE_ANALYSIS, label: MODE_LABEL[f.tool].ana },
              { value: MODE_SYNTHESIS, label: MODE_LABEL[f.tool].syn },
            ]}
          />

          {isTiming && (
            <>
              <NumberField
                label="Direnç (R)"
                value={f.R} onChange={set('R')}
                units={['Ω', 'kΩ', 'MΩ']} unit={f.Ru} onUnit={set('Ru')}
              />

              {mode === MODE_ANALYSIS ? (
                f.tool === TOOL_RC ? (
                  <NumberField
                    label="Kapasite (C)"
                    value={f.C} onChange={set('C')}
                    units={['F', 'µF', 'nF', 'pF']} unit={f.Cu} onUnit={set('Cu')}
                  />
                ) : (
                  <NumberField
                    label="Endüktans (L)"
                    value={f.L} onChange={set('L')}
                    units={['H', 'mH', 'µH', 'nH']} unit={f.Lu} onUnit={set('Lu')}
                  />
                )
              ) : (
                <NumberField
                  label="Hedef zaman sabiti (τ)"
                  value={f.targetTau} onChange={set('targetTau')}
                  units={['s', 'ms', 'µs', 'ns']} unit={f.targetTauu} onUnit={set('targetTauu')}
                />
              )}

              <NumberField
                label="Besleme gerilimi"
                value={f.Vs} onChange={set('Vs')}
                units={['V', 'mV']} unit={f.Vsu} onUnit={set('Vsu')}
                hint="Eğri ve tepe akım için"
              />
            </>
          )}

          {f.tool === TOOL_CRYSTAL && (
            <>
              {mode === MODE_SYNTHESIS ? (
                <NumberField
                  label="Kristal yük kapasitesi (C_L)"
                  value={f.CL} onChange={set('CL')}
                  units={['pF']} unit="pF" onUnit={() => {}}
                  hint="Kristalin veri sayfasından okunur"
                />
              ) : (
                <>
                  <NumberField
                    label="C1"
                    value={f.C1} onChange={set('C1')}
                    units={['pF']} unit="pF" onUnit={() => {}}
                  />
                  <NumberField
                    label="C2"
                    value={f.C2} onChange={set('C2')}
                    units={['pF']} unit="pF" onUnit={() => {}}
                  />
                </>
              )}

              <NumberField
                label="PCB parazitik kapasitesi"
                value={f.Cstray} onChange={set('Cstray')}
                units={['pF']} unit="pF" onUnit={() => {}}
                hint="Kısa izlerde tipik olarak 2–5 pF"
              />
              <NumberField
                label="MCU giriş kapasitesi"
                value={f.Cin} onChange={set('Cin')}
                units={['pF']} unit="pF" onUnit={() => {}}
                hint="Veri sayfasında verilmişse girin; boş bırakmak basit modeli kullanır"
              />
              <NumberField
                label="MCU çıkış kapasitesi"
                value={f.Cout} onChange={set('Cout')}
                units={['pF']} unit="pF" onUnit={() => {}}
              />
              <NumberField
                label="Kristal frekansı (opsiyonel)"
                value={f.fXtal} onChange={set('fXtal')}
                units={['Hz', 'kHz', 'MHz']} unit={f.fXtalu} onUnit={set('fXtalu')}
                hint="Yalnızca şemada gösterilir; hesaba girmez"
              />
            </>
          )}
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
              <p className="empty-note">{reasonText(r.reason, r)}</p>
            )
          ) : (
            <>
              {isTiming ? (
                <>
                  <div className="big-result">
                    <div className="label">
                      {r.mode === MODE_SYNTHESIS
                        ? f.tool === TOOL_RC ? 'Gerekli kapasite' : 'Gerekli endüktans'
                        : 'Zaman sabiti (τ)'}
                    </div>
                    <div className="value">
                      {r.mode === MODE_SYNTHESIS
                        ? fmtEng(f.tool === TOOL_RC ? r.C : r.L, f.tool === TOOL_RC ? 'F' : 'H', 4)
                        : fmtEng(r.tau, 's', 4)}
                    </div>
                    <div className="alt">
                      τ = {fmtEng(r.tau, 's', 4)} &nbsp;·&nbsp; 5τ = {fmtEng(5 * r.tau, 's', 4)}
                      &nbsp;·&nbsp; t_r = {fmtEng(r.riseTime1090, 's', 4)}
                    </div>
                  </div>

                  {status && <span className={`status ${status.cls}`}>{status.text}</span>}

                  <table className="result-table">
                    <tbody>
                      <tr><td>Zaman sabiti τ</td><td>{fmtEng(r.tau, 's', 5)}</td></tr>
                      <tr><td>%10 → %90 yükselme</td><td>{fmtEng(r.riseTime1090, 's', 5)}</td></tr>
                      <tr className="mini-head"><td>Yerleşme</td><td>süre · ulaşılan oran</td></tr>
                      {r.steps.map((st) => (
                        <tr key={st.n}>
                          <td>{st.n}τ</td>
                          <td>{fmtEng(st.time, 's', 4)} · %{fmt(st.pct, 4)}</td>
                        </tr>
                      ))}
                      <tr>
                        <td>{f.tool === TOOL_RC ? 'Anahtarlama tepe akımı' : 'Sürekli rejim akımı'}</td>
                        <td>{fmtAmp(r.Ifinal, 4)}</td>
                      </tr>
                      {r.mode === MODE_SYNTHESIS && (
                        <tr>
                          <td>En yakın E24 değeri</td>
                          <td>
                            {f.tool === TOOL_RC
                              ? `${fmt(r.nearestC.value, 4)} nF`
                              : `${fmt(r.nearestL.value, 4)} µH`}{' '}
                            <span className="sub">
                              ({fmtPct(f.tool === TOOL_RC ? r.nearestC.errorPct : r.nearestL.errorPct)})
                            </span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </>
              ) : (
                <>
                  <div className="big-result">
                    <div className="label">
                      {r.mode === MODE_SYNTHESIS ? 'Gerekli harici kapasitör (C1 = C2)' : 'Yük kapasitesi (C_L)'}
                    </div>
                    <div className="value">
                      {fmt(r.mode === MODE_SYNTHESIS ? r.C : r.achieved, 4)} pF
                    </div>
                    <div className="alt">
                      {r.mode === MODE_SYNTHESIS
                        ? `en yakın E24: ${fmt(r.nearest.value, 3)} pF → C_L = ${fmt(r.withStandard, 4)} pF (${fmtPct(r.standardErrPct)})`
                        : `parazitik ${fmt(r.Cstray, 3)} pF dahil`}
                    </div>
                  </div>

                  {status && <span className={`status ${status.cls}`}>{status.text}</span>}

                  <table className="result-table">
                    <tbody>
                      {r.mode === MODE_SYNTHESIS ? (
                        <>
                          <tr><td>Hedef C_L</td><td>{fmt(r.CL, 4)} pF</td></tr>
                          <tr><td>Hesaplanan C1 = C2</td><td>{fmt(r.C, 5)} pF</td></tr>
                          <tr>
                            <td>Bu değerle gerçekleşen C_L</td>
                            <td>{fmt(r.achieved, 5)} pF</td>
                          </tr>
                          <tr className="mini-head"><td>Standart değerle</td><td>kapasitör · C_L · sapma</td></tr>
                          <tr>
                            <td>E24</td>
                            <td>
                              {fmt(r.nearest.value, 4)} pF · {fmt(r.withStandard, 4)} pF ·{' '}
                              {fmtPct(r.standardErrPct)}
                            </td>
                          </tr>
                        </>
                      ) : (
                        <>
                          <tr><td>C1</td><td>{fmt(r.C1, 4)} pF</td></tr>
                          <tr><td>C2</td><td>{fmt(r.C2, 4)} pF</td></tr>
                          <tr><td>Gerçekleşen C_L</td><td>{fmt(r.achieved, 5)} pF</td></tr>
                        </>
                      )}
                      <tr><td>PCB parazitik kapasitesi</td><td>{fmt(r.Cstray, 4)} pF</td></tr>
                      <tr><td>MCU giriş / çıkış kapasitesi</td><td>{fmt(r.Cin, 3)} / {fmt(r.Cout, 3)} pF</td></tr>
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

          <pre className="formula">{FORMULA[f.tool]}</pre>

          {r.ok && isTiming && (
            <ul className="detail-list">
              <li>
                τ = {fmtEng(r.tau, 's', 6)}; bu değer {f.tool === TOOL_RC ? 'R·C' : 'L/R'} çarpımından gelir.
              </li>
              <li>Besleme {fmtVolt(r.Vs)}, seri direnç {fmtRes(r.R, 4)}.</li>
              {r.mode === MODE_SYNTHESIS && (
                <li>Değer kapalı formdan başlatılıp {r.solvedBy} yöntemiyle doğrulandı.</li>
              )}
              <li>Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.</li>
            </ul>
          )}

          {r.ok && !isTiming && (
            <ul className="detail-list">
              <li>
                Kullanılan model: {r.mode === MODE_SYNTHESIS && r.simplified
                  ? 'basitleştirilmiş (giriş kapasiteleri sıfır)'
                  : 'genel denklem (giriş kapasiteleri dahil)'}.
              </li>
              <li>Harici kapasitörlerin seri eşdeğeri C/2, parazitik doğrudan eklenir.</li>
              <li>Eğrinin eğimi 1/2'dir: harici kapasitörü 2 pF artırmak C_L'yi 1 pF artırır.</li>
            </ul>
          )}

          <h2 className="section">Geçerlilik ve varsayımlar</h2>
          <ul className="detail-list">
            {ASSUMPTIONS[f.tool].map((a) => <li key={a}>{a}</li>)}
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
                ...chartSeries.map((cs) => ({ label: cs.name, tone: cs.tone, kind: 'line' })),
                ...s.refs.map((ref) => ({
                  label: ref.key === 'final' ? 'son değer' : ref.key === 'tau' ? '1τ seviyesi (%63.2)' : 'hedef C_L',
                  tone: 'tone-muted',
                  kind: 'line',
                })),
              ]}
            />

            <LineChart
              xScale="linear"
              xLabel={chartMeta.x}
              yLabel={chartMeta.y}
              series={chartSeries}
              refLines={s.refs.map((ref) => ({
                key: ref.key,
                y: ref.y,
                label: ref.key === 'final'
                  ? 'son değer'
                  : ref.key === 'tau'
                    ? '%63.2'
                    : `hedef ${fmt(ref.y, 3)} pF`,
              }))}
              marker={{ ...s.marker, label: isTiming ? '1τ' : 'seçilen' }}
              formatX={(v) => (isTiming ? fmtEng(v, '', 3) : fmt(v, 3))}
              formatY={(v) => fmt(v, 3)}
              caption={chartMeta.caption}
            />

            <ChartDataTable
              xLabel={chartMeta.x}
              series={chartSeries}
              every={6}
              formatX={(v) => (isTiming ? fmtEng(v, 's', 4) : `${fmt(v, 4)} pF`)}
              formatY={(v) => fmt(v, 4)}
            />
          </>
        ) : (
          <p className="empty-note">Grafik için geçerli girdi gerekli.</p>
        )}
      </section>

      <Link className="backlink" to="/kategori/komponent">← Komponent ve Devre Hesapları</Link>
    </>
  )
}
