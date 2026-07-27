import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import TextField from '../../../components/TextField'
import Segmented from '../../../components/Segmented'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import useToolForm from '../../../hooks/useToolForm'
import {
  fmt, fmtEng, fmtRes, fmtAmp, fmtPow, fmtVolt, fmtPct, THOUSANDS_MESSAGE,
} from '../../../lib/num'
import CircuitSchematic from './schematic'
import {
  INITIAL_FORM, TOOLS, TOOL_OHM, TOOL_LED, TOOL_RLC, TOOL_COMBO,
  MODE_ANALYSIS, MODE_SYNTHESIS, HAS_MODES,
  COMBO_SERIES, COMBO_PARALLEL,
  REASON_INCOMPLETE,
  compute, buildSweep,
} from './model'
import {
  TOOL_LABEL, KIND_LABEL, CHART, reasonText, valueListError, commentary,
} from './text'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }

const FORMULA = {
  [TOOL_OHM]: `V = I·R
I = V/R
R = V/I

P = V·I
P = I²·R
P = V²/R

Tutarsızlık oranı
(V, I, R birlikte girilirse):
  E = |V − I·R| / |V|`,
  [TOOL_LED]: `V_LED = Σ V_f,i
  (seri LED'ler)
R = (V_s − V_LED) / I_LED
P_R = I_LED²·R
    = (V_s − V_LED)·I_LED

Güvenli güç seçimi:
  P_nominal ≥ P_R / D
    (D: kullanım oranı)`,
  [TOOL_RLC]: `X_L = 2πfL
X_C = 1/(2πfC)
Z = R + j(X_L − X_C)
|Z| = √(R² + (X_L − X_C)²)
φ = atan[(X_L − X_C)/R]

f₀ = 1/(2π√(LC))
Q = ω₀L/R = 1/(ω₀CR)
BW = f₀/Q`,
  [TOOL_COMBO]: `Seri: R_eş = Σ Rᵢ
Paralel: R_eş = (Σ 1/Rᵢ)⁻¹
İki için: R_eş = R₁R₂/(R₁+R₂)

Paralelde akım payı:
  Iᵢ = I · (1/Rᵢ) / Σ(1/Rⱼ)`,
}

const ASSUMPTIONS = {
  [TOOL_OHM]: [
    'Model saf DC ve dirençseldir; sıcaklıkla direnç değişimi yoktur.',
    'Güç değerlendirmesi sürekli çalışma içindir; darbeli yükte paket daha yüksek tepe gücü kaldırabilir.',
  ],
  [TOOL_LED]: [
    'LED sabit ileri gerilimli eleman olarak modellenir. Gerçekte V_f akımla ve sıcaklıkla değişir.',
    'İleri gerilim toleransı doğrudan akıma geçer; parça arası parlaklık farkı bu hesapta yoktur.',
    'Darbeli sürüşte (PWM) ortalama akım farklıdır; buradaki sonuç sürekli akım içindir.',
  ],
  [TOOL_RLC]: [
    'Komponentler ideal kabul edilir: kondansatörde ESR/ESL, bobinde öz kapasite ve kayıp yoktur.',
    'Yüksek frekansta gerçek empedans bu modelden belirgin biçimde sapar.',
    'Model seri RLC içindir; paralel rezonans devresi farklı davranır.',
  ],
  [TOOL_COMBO]: [
    'Dirençler ideal ve birbirinden bağımsız kabul edilir.',
    'Toleranslar birbirini götürmez; eşdeğerin toleransı tek bir direncinkinden iyi olmaz.',
    'Paralel kollarda öz ısınma farkı ve termal kayma dikkate alınmaz.',
  ],
}

export default function LedOhmRlc() {
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

  const chartMeta = s ? CHART[s.kind] : null
  const chartSeries = s
    ? [{ key: 'main', name: chartMeta.y, tone: toneClass(0), points: s.points }]
    : []

  return (
    <>
      <div className="tool-header">
        <h1>LED, Ohm Kanunu &amp; RLC</h1>
        <p>
          Ohm kanunu ve güç, LED seri direnci, seri RLC empedansı ile seri/paralel direnç
          birleşimlerini tek ekranda hesaplar; standart değer karşılıkları ve güç marjıyla
          birlikte verir.
        </p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>Girdiler</h2>

          <CircuitSchematic r={r} form={f} />

          <SelectField
            label="Hesap"
            value={f.tool} onChange={set('tool')}
            options={TOOLS.map((t) => ({ value: t, label: TOOL_LABEL[t] }))}
          />

          {HAS_MODES[f.tool] && (
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: MODE_ANALYSIS, label: 'Analiz — empedansı bul' },
                { value: MODE_SYNTHESIS, label: 'Sentez — kapasiteyi bul' },
              ]}
            />
          )}

          {f.tool === TOOL_OHM && (
            <>
              <p className="method-note">
                Herhangi iki alanı doldurun, kalan ikisi hesaplanır. Üçünü doldurursanız
                tutarsızlık oranı gösterilir.
              </p>
              <NumberField
                label="Gerilim (V)"
                value={f.V} onChange={set('V')}
                units={['V', 'mV', 'kV']} unit={f.Vu} onUnit={set('Vu')}
                placeholder="boş = hesapla"
              />
              <NumberField
                label="Akım (I)"
                value={f.I} onChange={set('I')}
                units={['A', 'mA', 'µA']} unit={f.Iu} onUnit={set('Iu')}
                placeholder="boş = hesapla"
              />
              <NumberField
                label="Direnç (R)"
                value={f.R} onChange={set('R')}
                units={['Ω', 'kΩ', 'MΩ']} unit={f.Ru} onUnit={set('Ru')}
                placeholder="boş = hesapla"
              />
              <NumberField
                label="Güç (P)"
                value={f.P} onChange={set('P')}
                units={['W', 'mW', 'kW']} unit={f.Pu} onUnit={set('Pu')}
                placeholder="boş = hesapla"
              />
            </>
          )}

          {f.tool === TOOL_LED && (
            <>
              <NumberField
                label="Besleme gerilimi (V_s)"
                value={f.Vs} onChange={set('Vs')}
                units={['V', 'mV']} unit={f.Vsu} onUnit={set('Vsu')}
              />
              <NumberField
                label="LED ileri gerilimi (V_f)"
                value={f.Vf} onChange={set('Vf')}
                units={['V', 'mV']} unit={f.Vfu} onUnit={set('Vfu')}
                hint="Kırmızı ≈ 1.8–2.2 V, yeşil/mavi/beyaz ≈ 2.8–3.4 V"
              />
              <NumberField
                label="Seri LED sayısı"
                value={f.n} onChange={set('n')}
                units={['adet']} unit="adet" onUnit={() => {}}
              />
              <NumberField
                label="LED akımı"
                value={f.Iled} onChange={set('Iled')}
                units={['mA', 'A']} unit={f.Iledu} onUnit={set('Iledu')}
              />
              <NumberField
                label="Güç kullanım oranı"
                value={f.derating} onChange={set('derating')}
                units={['%']} unit="%" onUnit={() => {}}
                hint="Direnç nominal gücünün en fazla bu oranında çalıştırılır"
              />
            </>
          )}

          {f.tool === TOOL_RLC && (
            <>
              <NumberField
                label="Direnç (R)"
                value={f.Rr} onChange={set('Rr')}
                units={['Ω', 'mΩ', 'kΩ']} unit={f.Rru} onUnit={set('Rru')}
              />
              <NumberField
                label="Endüktans (L)"
                value={f.L} onChange={set('L')}
                units={['H', 'mH', 'µH', 'nH']} unit={f.Lu} onUnit={set('Lu')}
              />
              {mode === MODE_ANALYSIS ? (
                <>
                  <NumberField
                    label="Kapasite (C)"
                    value={f.C} onChange={set('C')}
                    units={['F', 'µF', 'nF', 'pF']} unit={f.Cu} onUnit={set('Cu')}
                  />
                  <NumberField
                    label="Frekans (f)"
                    value={f.freq} onChange={set('freq')}
                    units={['Hz', 'kHz', 'MHz', 'GHz']} unit={f.frequ} onUnit={set('frequ')}
                  />
                </>
              ) : (
                <NumberField
                  label="Hedef rezonans frekansı"
                  value={f.targetF0} onChange={set('targetF0')}
                  units={['Hz', 'kHz', 'MHz', 'GHz']} unit={f.targetF0u} onUnit={set('targetF0u')}
                  hint="Gerekli kapasite sınırlandırılmış kök aramayla bulunur"
                />
              )}
            </>
          )}

          {f.tool === TOOL_COMBO && (
            <>
              <SelectField
                label="Bağlantı"
                value={f.combo} onChange={set('combo')}
                options={[
                  { value: COMBO_PARALLEL, label: 'Paralel' },
                  { value: COMBO_SERIES, label: 'Seri' },
                ]}
              />
              <TextField
                label="Direnç değerleri"
                value={f.values} onChange={set('values')}
                hint="Virgülle ayırın; k ve M son eki kullanılabilir: 10k, 22k, 4.7M"
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
              <p className="empty-note">
                {f.tool === TOOL_COMBO && r.reason === REASON_INCOMPLETE
                  ? valueListError(r.at)
                  : reasonText(r.reason, r)}
              </p>
            )
          ) : (
            <>
              {r.tool === TOOL_OHM && (
                <>
                  <div className="big-result">
                    <div className="label">Harcanan güç</div>
                    <div className="value">{fmtPow(r.P, 4)}</div>
                    <div className="alt">
                      V = {fmtVolt(r.V)} &nbsp;·&nbsp; I = {fmtAmp(r.I)} &nbsp;·&nbsp; R = {fmtRes(r.R)}
                    </div>
                  </div>
                  {status && <span className={`status ${status.cls}`}>{status.text}</span>}
                  <table className="result-table">
                    <tbody>
                      <tr><td>Gerilim</td><td>{fmtVolt(r.V)}</td></tr>
                      <tr><td>Akım</td><td>{fmtAmp(r.I)}</td></tr>
                      <tr><td>Direnç</td><td>{fmtRes(r.R)}</td></tr>
                      <tr><td>Güç</td><td>{fmtPow(r.P)}</td></tr>
                      {r.inconsistency != null && (
                        <tr>
                          <td>Girdi tutarsızlığı</td>
                          <td>{fmt(r.inconsistency * 100, 3)} %</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </>
              )}

              {r.tool === TOOL_LED && (
                <>
                  <div className="big-result">
                    <div className="label">Gerekli seri direnç</div>
                    <div className="value">{fmtRes(r.R, 4)}</div>
                    <div className="alt">
                      en yakın E24: {fmtRes(r.e24.value, 4)} → {fmtAmp(r.e24.I, 3)}
                    </div>
                  </div>
                  {status && <span className={`status ${status.cls}`}>{status.text}</span>}
                  <table className="result-table">
                    <tbody>
                      <tr><td>Toplam LED gerilimi</td><td>{fmtVolt(r.Vled)}</td></tr>
                      <tr><td>Dirence düşen gerilim</td><td>{fmtVolt(r.headroom)}</td></tr>
                      <tr><td>İdeal direnç</td><td>{fmtRes(r.R, 5)}</td></tr>
                      <tr><td>Direnç gücü</td><td>{fmtPow(r.P, 4)}</td></tr>
                      <tr>
                        <td>Gereken nominal güç</td>
                        <td>{fmtPow(r.Prated, 4)} <span className="sub">(%{fmt(r.derating * 100, 3)} kullanım)</span></td>
                      </tr>
                      <tr className="mini-head"><td>Standart değerle</td><td>direnç · akım · sapma</td></tr>
                      <tr>
                        <td>E24</td>
                        <td>
                          {fmtRes(r.e24.value, 4)} · {fmtAmp(r.e24.I, 3)} ·{' '}
                          {fmtPct((100 * (r.e24.I - r.targetI)) / r.targetI)}
                        </td>
                      </tr>
                      <tr>
                        <td>E96</td>
                        <td>
                          {fmtRes(r.e96.value, 4)} · {fmtAmp(r.e96.I, 3)} ·{' '}
                          {fmtPct((100 * (r.e96.I - r.targetI)) / r.targetI)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}

              {r.tool === TOOL_RLC && (
                <>
                  <div className="big-result">
                    <div className="label">
                      {r.mode === MODE_SYNTHESIS ? 'Gerekli kapasite' : `Empedans @ ${fmtEng(r.f, 'Hz', 4)}`}
                    </div>
                    <div className="value">
                      {r.mode === MODE_SYNTHESIS ? fmtEng(r.C, 'F', 4) : fmtRes(r.magnitude, 4)}
                    </div>
                    <div className="alt">
                      f₀ = {fmtEng(r.f0, 'Hz', 4)} &nbsp;·&nbsp; Q = {fmt(r.Q, 4)} &nbsp;·&nbsp;{' '}
                      {KIND_LABEL[r.kind]}
                    </div>
                  </div>
                  {status && <span className={`status ${status.cls}`}>{status.text}</span>}
                  <table className="result-table">
                    <tbody>
                      <tr><td>Endüktif reaktans X_L</td><td>{fmtRes(r.XL, 4)}</td></tr>
                      <tr><td>Kapasitif reaktans X_C</td><td>{fmtRes(r.XC, 4)}</td></tr>
                      <tr><td>Net reaktans X</td><td>{fmtRes(r.X, 4)}</td></tr>
                      <tr><td>Empedans büyüklüğü |Z|</td><td>{fmtRes(r.magnitude, 4)}</td></tr>
                      <tr><td>Faz açısı</td><td>{fmt(r.phaseDeg, 4)}°</td></tr>
                      <tr><td>Rezonans frekansı f₀</td><td>{fmtEng(r.f0, 'Hz', 5)}</td></tr>
                      <tr><td>Kalite faktörü Q</td><td>{fmt(r.Q, 4)}</td></tr>
                      <tr><td>Bant genişliği</td><td>{fmtEng(r.BW, 'Hz', 4)}</td></tr>
                      {r.mode === MODE_SYNTHESIS && (
                        <tr>
                          <td>En yakın E24 kapasite</td>
                          <td>
                            {fmt(r.nearestC.value, 4)} pF{' '}
                            <span className="sub">({fmtPct(r.nearestC.errorPct)})</span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </>
              )}

              {r.tool === TOOL_COMBO && (
                <>
                  <div className="big-result">
                    <div className="label">
                      Eşdeğer direnç ({r.combo === COMBO_SERIES ? 'seri' : 'paralel'})
                    </div>
                    <div className="value">{fmtRes(r.equivalent, 4)}</div>
                    <div className="alt">
                      {r.values.length} direnç &nbsp;·&nbsp; en yakın tek değer{' '}
                      {fmtRes(r.nearestE24.value, 4)} ({fmtPct(r.nearestE24.errorPct)})
                    </div>
                  </div>
                  {status && <span className={`status ${status.cls}`}>{status.text}</span>}
                  <table className="result-table">
                    <tbody>
                      <tr className="mini-head">
                        <td>Direnç</td>
                        <td>{r.combo === COMBO_SERIES ? 'gerilim payı' : 'akım payı'}</td>
                      </tr>
                      {r.values.map((x, i) => (
                        <tr key={`${x}-${i}`}>
                          <td>{fmtRes(x, 4)}</td>
                          <td>{fmt(r.shares[i] * 100, 3)} %</td>
                        </tr>
                      ))}
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

          {r.ok && r.tool === TOOL_RLC && (
            <ul className="detail-list">
              <li>ω = 2πf = {fmtEng(2 * Math.PI * r.f, 'rad/s', 4)}.</li>
              <li>X_L − X_C = {fmtRes(r.X, 5)}; işareti devrenin karakterini belirler.</li>
              <li>Q iki tanımdan da aynı çıkar: ω₀L/R ve 1/(ω₀CR).</li>
              {r.mode === MODE_SYNTHESIS && (
                <li>Kapasite kapalı formdan başlatılıp {r.solvedBy} yöntemiyle doğrulandı.</li>
              )}
            </ul>
          )}

          {r.ok && r.tool === TOOL_LED && (
            <ul className="detail-list">
              <li>Dirence düşen gerilim beslemenin %{fmt((r.headroom / r.Vs) * 100, 3)}'i.</li>
              <li>İdeal direnç {fmtRes(r.R, 6)}; kuantalama hatası standart değer seçiminden gelir.</li>
            </ul>
          )}

          {r.ok && r.tool === TOOL_OHM && (
            <ul className="detail-list">
              <li>Girilen bağımsız değerler: {r.given.join(', ')}.</li>
              <li>Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.</li>
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
                { label: chartMeta.y, tone: toneClass(0), kind: 'line' },
                ...s.refs.map((ref) => ({
                  label: ref.key === 'target' ? 'hedef akım' : 'direnç değeri (rezonans tabanı)',
                  tone: 'tone-muted',
                  kind: 'line',
                })),
              ]}
            />

            <LineChart
              xScale="log"
              xLabel={chartMeta.x}
              yLabel={chartMeta.y}
              series={chartSeries}
              refLines={s.refs.map((ref) => ({
                key: ref.key,
                y: ref.y,
                label: ref.key === 'target' ? `hedef ${fmtAmp(ref.y, 3)}` : `R = ${fmtRes(ref.y, 3)}`,
              }))}
              marker={{ ...s.marker, label: 'çalışma noktası' }}
              formatX={(v) => fmtEng(v, '', 3).replace(' ', '')}
              formatY={(v) => fmt(v, 3)}
              caption={chartMeta.caption}
            />

            <ChartDataTable
              xLabel={chartMeta.x}
              series={chartSeries}
              every={6}
              formatX={(v) => fmtEng(v, '', 4)}
              formatY={(v) => fmt(v, 4)}
            />
          </>
        ) : (
          <p className="empty-note">
            {f.tool === TOOL_COMBO
              ? 'Seri/paralel birleşimin taranacak sürekli bir parametresi yok; sonuç tablosu tüm bilgiyi taşır.'
              : 'Grafik için geçerli girdi gerekli.'}
          </p>
        )}
      </section>

      <Link className="backlink" to="/kategori/komponent">← Komponent ve Devre Hesapları</Link>
    </>
  )
}
