import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import Segmented from '../../../components/Segmented'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import useToolForm from '../../../hooks/useToolForm'
import { fmt, fmtRes, fmtPct, fmtVolt, fmtAmp, fmtWatt, THOUSANDS_MESSAGE } from '../../../lib/num'
import TerminationSchematic from './schematic'
import {
  INITIAL_FORM, TERM_TYPES, TERM_SERIES, TERM_PARALLEL, TERM_THEVENIN,
  THEVENIN_ESERIES_OPTIONS,
  compute, buildSweep,
} from './model'
import {
  TYPE_LABEL, TYPE_NOTE, METHOD_NOTE, SERIES_ESERIES_NOTE, THEVENIN_IDC_NOTE,
  DEV_THRESHOLD_NOTE, DEV_WARN_PCT, DEV_DANGER_PCT,
  CHART, REF_LABEL, reasonText, commentary,
} from './text'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }
const VOLT_UNITS = ['V', 'mV', 'kV']

const FORMULA = `Seri terminasyon (spec §7.7):
  R_s = Z₀ − R_driver
  R_s < 0 →
    seri terminasyon önerilmez

Paralel terminasyon:
  R_T   = Z₀
  P_dc  = V² / R_T
  P_ort = D · V² / R_T

Thevenin terminasyonu:
  a = V_bias / V_cc

  R_top    = Z₀ / a
           = Z₀ · V_cc / V_bias
  R_bottom = Z₀ / (1 − a)
           = Z₀ · V_cc
             / (V_cc − V_bias)

  R_top ∥ R_bottom = Z₀
  V_bias = V_cc · R_bottom
           / (R_top + R_bottom)

Sürekli akım ve güç — OHM YASASI,
spec §7.7'de TANIMLI DEĞİL:
  paralel:
    I_dc = V / R_T
  Thevenin:
    I_dc = V_cc
           / (R_top + R_bottom)
    P_dc = V_cc²
           / (R_top + R_bottom)

Standart çift seçildikten sonra
gerçek bias ve gerçek paralel
direnç yeniden hesaplanır —
kuantalama ikisini birden
kaydırır.`

// Bulgu listesi iki yerde kullanılır: sonuç varken ve seri terminasyonun
// geçersiz kaldığı durumda (hesap yok ama gerekçe danger seviyesinde yazılır).
function Commentary({ notes }) {
  if (notes.length === 0) return null
  return (
    <>
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
  )
}

export default function Termination() {
  const [type, setType] = useState(TERM_SERIES)
  const { f, set } = useToolForm(INITIAL_FORM)

  const r = useMemo(() => compute(type, f), [type, f])
  const s = useMemo(() => buildSweep(r), [r])
  const notes = useMemo(() => commentary(r), [r])

  // Durum çipi tek kurala bağlıdır: bulguların en kötü seviyesi gösterilir.
  const status = useMemo(() => {
    if (notes.length === 0) return null
    const worst = notes.reduce((acc, n) => (LEVEL_RANK[n.level] > LEVEL_RANK[acc] ? n.level : acc), 'ok')
    const count = notes.filter((n) => n.level === worst).length
    if (worst === 'ok') return { cls: 'ok', text: 'Tüm kontroller geçti' }
    if (worst === 'warn') return { cls: 'warn', text: `Sınıra yakın — ${count} uyarı` }
    return { cls: 'danger', text: `${count} kontrol sınırın dışında` }
  }, [notes])

  const meta = CHART[type]
  const chartSeries = s
    ? s.series.map((serie, i) => ({
        key: serie.key,
        name: meta.names[serie.key],
        tone: toneClass(i),
        points: serie.points,
      }))
    : []

  const isPower = type === TERM_PARALLEL
  const formatValue = (v) => (isPower ? fmtWatt(v) : fmtRes(v, 4))

  return (
    <>
      <Link className="backlink" to="/kategori/sinyal-butunlugu">← Sinyal Bütünlüğü</Link>

      <div className="tool-header">
        <h1>Termination Calculator</h1>
        <p>
          Seri, paralel ve Thevenin terminasyon için direnç değerlerini, standart E serisi
          karşılıklarını ve kuantalamanın empedans ile bias üzerinde bıraktığı sapmayı hesaplar.
        </p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>Girdiler</h2>

          <TerminationSchematic r={r} />

          <Segmented
            value={type}
            onChange={setType}
            options={TERM_TYPES.map((x) => ({ value: x, label: TYPE_LABEL[x] }))}
          />

          <NumberField
            label="Hat empedansı (Z₀)"
            value={f.Z0} onChange={set('Z0')}
            units={['Ω']} unit="Ω" onUnit={() => {}}
            hint="Kontrollü empedans hattının karakteristik empedansı"
          />

          {type === TERM_SERIES && (
            <NumberField
              label="Sürücü çıkış direnci (R_driver)"
              value={f.Rdriver} onChange={set('Rdriver')}
              units={['Ω']} unit="Ω" onUnit={() => {}}
              hint="Sürücünün veri sayfasındaki çıkış empedansı; 0 girilebilir"
            />
          )}

          {type === TERM_PARALLEL && (
            <>
              <NumberField
                label="Terminasyon gerilimi (V)"
                value={f.V} onChange={set('V')}
                units={VOLT_UNITS} unit={f.Vu} onUnit={set('Vu')}
                hint="Terminasyon direnci üzerinde kalan sürekli gerilim farkı"
              />
              <NumberField
                label="Duty cycle"
                value={f.duty} onChange={set('duty')}
                units={['%']} unit="%" onUnit={() => {}}
                hint="Yalnızca ortalama gücü etkiler; 0'dan büyük, en çok 100"
              />
            </>
          )}

          {type === TERM_THEVENIN && (
            <>
              <NumberField
                label="Besleme gerilimi (V_cc)"
                value={f.Vcc} onChange={set('Vcc')}
                units={VOLT_UNITS} unit={f.Vccu} onUnit={set('Vccu')}
              />
              <NumberField
                label="Hedef bias gerilimi (V_bias)"
                value={f.Vbias} onChange={set('Vbias')}
                units={VOLT_UNITS} unit={f.Vbiasu} onUnit={set('Vbiasu')}
                hint="V_cc'den küçük olmalı"
              />
              <SelectField
                label="E serisi"
                value={f.eseries} onChange={set('eseries')}
                options={THEVENIN_ESERIES_OPTIONS.map((x) => ({ value: x, label: x }))}
                hint="Standart direnç çifti bu diziden seçilir"
              />
            </>
          )}
        </section>

        {/* ---------- Orta: Ana sonuç ---------- */}
        <section className="panel">
          <h2>Sonuç</h2>

          {!r.ok ? (
            <>
              {r.ambiguous ? (
                <p className="empty-note warn">
                  {THOUSANDS_MESSAGE} Etkilenen alan: {r.ambiguous.join(', ')}.
                </p>
              ) : (
                <p className="empty-note">
                  {reasonText(r.reason)}
                  {r.invalid && r.invalid.length > 0 && ` Etkilenen alan: ${r.invalid.join(', ')}.`}
                </p>
              )}

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}
              <Commentary notes={notes} />
            </>
          ) : (
            <>
              <div className="big-result">
                <div className="label">
                  {r.type === TERM_SERIES && 'Gereken seri direnç'}
                  {r.type === TERM_PARALLEL && 'Terminasyon direnci'}
                  {r.type === TERM_THEVENIN && `Standart çift (${r.series})`}
                </div>
                <div className="value">
                  {r.type === TERM_SERIES && fmtRes(r.Rs, 4)}
                  {r.type === TERM_PARALLEL && fmtRes(r.RT, 4)}
                  {r.type === TERM_THEVENIN
                    && `${fmtRes(r.standard.Rtop, 3)} / ${fmtRes(r.standard.Rbottom, 3)}`}
                </div>
                <div className="alt">
                  {r.type === TERM_SERIES && (r.std
                    ? <>en yakın {r.eseries} {fmtRes(r.std.value, 4)} &nbsp;·&nbsp; kaynak empedansı {fmtRes(r.withStandard, 4)}</>
                    : <>sürücü zaten eşlemeli — ek seri direnç gerekmiyor</>)}
                  {r.type === TERM_PARALLEL
                    && <>sürekli {fmtWatt(r.Pdc)} DC güç &nbsp;·&nbsp; ortalama {fmtWatt(r.Pavg)}</>}
                  {r.type === TERM_THEVENIN
                    && <>R∥ = {fmtRes(r.standard.Rpar, 4)} ({fmtPct(r.standard.zErr)}) &nbsp;·&nbsp; bias {fmtVolt(r.standard.bias)} ({fmtPct(r.standard.vErr)})</>}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <p className="method-note">{METHOD_NOTE}</p>
              {r.type === TERM_SERIES && <p className="method-note">{SERIES_ESERIES_NOTE}</p>}
              {r.type === TERM_THEVENIN && <p className="method-note">{THEVENIN_IDC_NOTE}</p>}

              <table className="result-table">
                <tbody>
                  {r.type === TERM_SERIES && (
                    <>
                      <tr>
                        <td>Seri direnç (R_s)</td>
                        <td>{fmtRes(r.Rs, 5)}</td>
                      </tr>
                      {r.nearest.map((n, i) => (
                        <tr key={n.value}>
                          <td>
                            En yakın {r.eseries} değeri {i + 1}
                          </td>
                          <td>{fmtRes(n.value, 4)} <span className="sub">({fmtPct(n.errorPct)})</span></td>
                        </tr>
                      ))}
                      <tr>
                        <td>Standart değerle kaynak empedansı</td>
                        <td>
                          {r.withStandard != null ? fmtRes(r.withStandard, 5) : '—'}
                          {r.stdErrPct != null && (
                            <span className="sub"> ({fmtPct(r.stdErrPct)})</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td>İdeal toplam kaynak empedansı</td>
                        <td>{fmtRes(r.total, 5)}</td>
                      </tr>
                      <tr>
                        <td>Sürücü çıkış direnci (R_driver)</td>
                        <td>{fmtRes(r.Rdriver, 5)}</td>
                      </tr>
                      <tr>
                        <td>Hat empedansı (Z₀)</td>
                        <td>{fmtRes(r.Z0, 5)}</td>
                      </tr>
                    </>
                  )}

                  {r.type === TERM_PARALLEL && (
                    <>
                      <tr>
                        <td>Terminasyon direnci (R_T)</td>
                        <td>{fmtRes(r.RT, 5)}</td>
                      </tr>
                      <tr>
                        <td>Sürekli DC akım (I_dc)</td>
                        <td>{fmtAmp(r.Idc, 5)}</td>
                      </tr>
                      <tr>
                        <td>Sürekli DC güç (P_dc)</td>
                        <td>{fmtWatt(r.Pdc)}</td>
                      </tr>
                      <tr>
                        <td>Duty cycle ile ortalama güç (P_ort)</td>
                        <td>{fmtWatt(r.Pavg)}</td>
                      </tr>
                      <tr>
                        <td>Duty cycle</td>
                        <td>{fmt(r.duty * 100, 4)} %</td>
                      </tr>
                      <tr>
                        <td>Terminasyon gerilimi (V)</td>
                        <td>{fmtVolt(r.V)}</td>
                      </tr>
                      <tr>
                        <td>Hat empedansı (Z₀)</td>
                        <td>{fmtRes(r.Z0, 5)}</td>
                      </tr>
                    </>
                  )}

                  {r.type === TERM_THEVENIN && (
                    <>
                      <tr>
                        <td>İdeal R_top</td>
                        <td>{fmtRes(r.ideal.Rtop, 5)}</td>
                      </tr>
                      <tr>
                        <td>İdeal R_bottom</td>
                        <td>{fmtRes(r.ideal.Rbottom, 5)}</td>
                      </tr>
                      <tr>
                        <td>Bias oranı (a = V_bias / V_cc)</td>
                        <td>{fmt(r.ideal.a, 5)}</td>
                      </tr>
                      <tr>
                        <td>Seçilen standart çift</td>
                        <td>{fmtRes(r.standard.Rtop, 4)} / {fmtRes(r.standard.Rbottom, 4)}</td>
                      </tr>
                      <tr>
                        <td>Gerçekleşen paralel direnç (R∥)</td>
                        <td>{fmtRes(r.standard.Rpar, 5)}</td>
                      </tr>
                      <tr>
                        <td>Z₀'dan sapma (zErr)</td>
                        <td>{fmtPct(r.standard.zErr)}</td>
                      </tr>
                      <tr>
                        <td>Gerçekleşen bias</td>
                        <td>{fmtVolt(r.standard.bias)}</td>
                      </tr>
                      <tr>
                        <td>Hedef bias'tan sapma (vErr)</td>
                        <td>{fmtPct(r.standard.vErr)}</td>
                      </tr>
                      <tr>
                        <td>Sürekli akım (I_dc)</td>
                        <td>{fmtAmp(r.Idc, 5)}</td>
                      </tr>
                      <tr>
                        <td>Sürekli güç (P_dc)</td>
                        <td>{fmtWatt(r.Pdc)}</td>
                      </tr>
                      <tr>
                        <td>E serisi</td>
                        <td>{r.series}</td>
                      </tr>
                      <tr>
                        <td>Hat empedansı (Z₀)</td>
                        <td>{fmtRes(r.Z0, 5)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>

              <Commentary notes={notes} />
            </>
          )}
        </section>

        {/* ---------- Sağ: Teknik detay ---------- */}
        <section className="panel panel-detail">
          <h2>Teknik detay</h2>

          <pre className="formula">{FORMULA}</pre>

          <ul className="detail-list">
            <li>{TYPE_NOTE[type]}</li>

            {r.ok && r.type === TERM_SERIES && (
              <>
                <li>
                  Motor R_s'yi Z₀ − R_driver olarak veriyor; standart adaylar en yakın üç
                  {' '}{r.eseries} değeri olarak dönüyor ve kaynak empedansı bunların en
                  yakınıyla yeniden hesaplanıyor.
                </li>
                <li>
                  İdeal toplam kaynak empedansı {fmtRes(r.total, 5)}; standart değerle
                  {' '}{r.withStandard != null ? fmtRes(r.withStandard, 5) : '—'}.
                </li>
              </>
            )}

            {r.ok && r.type === TERM_PARALLEL && (
              <>
                <li>
                  R_T = Z₀ olduğu için tasarım serbestliği yalnızca gerilim ve duty
                  cycle'dadır; direnç değeri hattın kendisi tarafından belirlenir.
                </li>
                <li>
                  Duty cycle motorda 0–1 aralığında tutulur; ekranda yüzde olarak girilir ve
                  yalnızca ortalama gücü ölçekler, sürekli gücü değiştirmez.
                </li>
              </>
            )}

            {r.ok && r.type === TERM_THEVENIN && (
              <>
                <li>
                  Motor her iki direnç için en yakın üç {r.series} değerini alıp dokuz
                  kombinasyonu deniyor ve |zErr| + |vErr| toplamını en küçükleyen çifti
                  seçiyor. Bu seçim iki sapmayı eşit ağırlıklı sayar; tasarımınızda biri
                  daha kritikse çifti elle değiştirmeniz gerekir.
                </li>
                <li>
                  Sürekli akım ve güç ideal çiftten hesaplanıyor, seçilen standart çiftten
                  değil — motorun döndürdüğü alanlar bu şekilde tanımlı.
                </li>
              </>
            )}

            <li>
              Sapma eşikleri {DEV_WARN_PCT} % ve {DEV_DANGER_PCT} % olarak alınmıştır; bu
              değerler mühendislik yorumudur, spec'ten gelmez.
            </li>
            <li>Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.</li>
          </ul>

          <h2 className="section">Geçerlilik ve varsayımlar</h2>
          <ul className="detail-list">
            <li>
              Üç yöntem farklı işler için kullanılır ve birbirinin yerine geçmez:
              <strong> seri</strong> kaynak ucunda eşleme yapar ve hat sonunda tek yük
              varsayar; <strong>paralel</strong> yük ucunda eşleme yapar ve sürekli güç
              harcar; <strong>Thevenin</strong> hem eşler hem bias verir, bedeli V_cc'den
              sürekli çekilen akımdır.
            </li>
            <li>
              Seçilen E serisi değerlerinin üretim toleransı doğrudan sonuca girer.
              Kuantalama sapmasıyla tolerans aynı yöne düşerse gerçek sapma burada
              gösterilenden büyük olur; tolerans motorda hesaplanmıyor.
            </li>
            <li>
              Motor yalnızca DC davranışı hesaplar. Kapasitif yük, sürücü kenar hızı, sap
              uzunluğu, yansıma ve çınlama simülasyonu yapılmaz — bunlar için zaman alanı
              simülasyonu veya ölçüm gerekir.
            </li>
            <li>
              <strong>Bilinen sınır:</strong> {SERIES_ESERIES_NOTE}
            </li>
            <li>
              <strong>Bilinen sınır:</strong> Thevenin sürekli akım ve gücü ideal direnç
              çiftinden geliyor; seçilen standart çiftin gerçek akımı bir miktar farklıdır.
            </li>
            <li>{DEV_THRESHOLD_NOTE}</li>
            <li>
              docs/spec.md §7.7'deki formül blokları markdown dönüşümünde kısmen bozulmuş
              (seri terminasyonun açılış köşeli parantezi düşmüş, Thevenin çözümündeki iki
              satırın başına başlık işareti girmiş). İfadeler yine de okunabildiği ve motor
              bunlarla birebir örtüştüğü için tahminle tamamlama yapılmadı; eksik bir
              büyüklük uydurulmadı.
            </li>
            <li>
              Paralel terminasyonda gerilim tek bir değer olarak alınır: direnç toprağa değil
              ayrı bir terminasyon rayına çekiliyorsa girilen V bu farkı yansıtmalıdır.
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
                ...chartSeries.map((serie) => ({
                  label: serie.name, tone: serie.tone, kind: 'line',
                })),
                ...s.refs.map((ref) => ({
                  label: REF_LABEL[ref.key], tone: 'tone-muted', kind: 'line',
                })),
              ]}
            />

            <LineChart
              xScale="linear"
              xLabel={meta.x}
              yLabel={meta.y}
              series={chartSeries}
              refLines={s.refs.map((ref) => ({
                key: ref.key, y: ref.y, label: REF_LABEL[ref.key],
              }))}
              marker={{ ...s.marker, label: 'çalışma noktası' }}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => fmt(v, 3)}
              caption={meta.caption}
            />

            <ChartDataTable
              xLabel={meta.x}
              series={chartSeries}
              every={6}
              formatX={(v) => `${fmt(v, 4)} Ω`}
              formatY={formatValue}
            />
          </>
        ) : (
          <p className="empty-note">Grafik için geçerli girdi gerekli.</p>
        )}
      </section>

    </>
  )
}
