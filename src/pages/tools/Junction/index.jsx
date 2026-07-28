import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import Segmented from '../../../components/Segmented'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import useToolForm from '../../../hooks/useToolForm'
import { fmt, fmtEng, fmtWatt, THOUSANDS_MESSAGE } from '../../../lib/num'
import { fromSI, AREA } from '../../../lib/units'
import JunctionSchematic from './schematic'
import {
  INITIAL_FORM, MODES, MODE_JUNCTION, MODE_HEATSINK, MODE_SURFACE,
  METRICS, COPPER_OPTIONS, COPPER_ON, compute, buildSweep,
} from './model'
import {
  MODE_LABEL, METRIC_LABEL, METRIC_SHORT, COPPER_LABEL,
  THETA_NOTE, PSI_NOTE, FIRST_ORDER_NOTE, MARGIN_THRESHOLD_NOTE,
  CHART, chartEmpty, reasonText, commentary,
} from './text'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }
const DIM_UNITS = ['mm', 'µm', 'mil']
const AREA_UNITS = ['mm²', 'mil²', 'm²']

const FORMULA = {
  [MODE_JUNCTION]: `T_J = T_A + P·θ_JA (spec §8.3)

P_max = (T_J,max − T_A) / θ_JA
kullanım = P / P_max

θ_JA sabit bir paket özelliği
DEĞİLDİR:
  test kartı, bakır alanı, hava
  akışı ve montaj şartları
  değeri değiştirir.`,

  [MODE_HEATSINK]: `T_J = T_A + P·(θ_JC + θ_CS + θ_SA)
  (spec §8.4)

termal bütçe = (T_J,max − T_A) / P
θ_SA,max = bütçe − θ_JC − θ_CS

θ_SA,max ≤ 0 →
  hiçbir soğutucu yetmez;
  gücü azalt, hava akışını artır
  veya farklı paket seç.`,

  [MODE_SURFACE]: `paket üstü: T_J ≈ T_top + Ψ_JT·P
  (spec §8.5)
kart üzeri: T_J ≈ T_board + Ψ_JB·P

Ψ ≠ θ
  θ_JC tek boyutlu bir yol
  direncidir.
  Ψ_JT paketten kaçan ısının
  yalnızca bir kısmını gören
  ampirik metriktir.
  Paket üstü ölçümde θ_JC
  kullanılmaz.`,
}

const COPPER_FORMULA = `bakır şerit: R_θ = L / (k_Cu·W·t)
  (spec §8.6)
dielektrik: R_θ = H / (k_FR4·A)
paralel: R_θ,eq = [ Σ 1/R_θ,i ]⁻¹
artış: ΔT = P · R_θ,eq`

export default function Junction() {
  const [mode, setMode] = useState(MODE_JUNCTION)
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

  const copperOn = f.copper === COPPER_ON
  const chartMeta = CHART[mode]
  const chartSeries = s
    ? [{ key: 'tj', name: 'T_J', tone: toneClass(0), points: s.points }]
    : []
  const chartX = (v) => (mode === MODE_HEATSINK ? `${fmt(v, 3)} °C/W` : `${fmt(v, 3)} W`)

  return (
    <>
      <Link className="backlink" to="/kategori/guc-termal">← Güç Bütünlüğü ve Termal</Link>

      <div className="tool-header">
        <h1>Junction Temperature &amp; Heatsink</h1>
        <p>
          Komponentin junction sıcaklığını ortam sıcaklığı ve termal dirençten hesaplar; gereken
          soğutucu direncini bulur, ölçülen yüzey sıcaklığından junction tahmini üretir ve
          isteğe bağlı olarak kart üzerindeki bakır termal ağını modeller.
        </p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>Girdiler</h2>

          <JunctionSchematic r={r} form={f} mode={mode} />

          <Segmented
            value={mode}
            onChange={setMode}
            options={MODES.map((m) => ({ value: m, label: MODE_LABEL[m] }))}
          />

          {mode === MODE_SURFACE ? (
            <>
              <NumberField
                label="Ölçülen sıcaklık"
                value={f.Tsurface} onChange={set('Tsurface')}
                units={['°C']} unit="°C" onUnit={() => {}}
                hint="Termal kamera veya termokupl ile okunan yüzey sıcaklığı"
              />
              <SelectField
                label="Ölçüm noktası"
                value={f.metric} onChange={set('metric')}
                options={METRICS.map((m) => ({ value: m, label: METRIC_LABEL[m] }))}
                hint="Ψ değeri yalnızca kendi ölçüm noktasıyla geçerlidir"
              />
              <NumberField
                label={`${METRIC_SHORT[f.metric]} değeri`}
                value={f.psi} onChange={set('psi')}
                units={['°C/W']} unit="°C/W" onUnit={() => {}}
                hint="Üreticinin verdiği ampirik metrik — θ değeri değildir"
              />
            </>
          ) : (
            <NumberField
              label="Ortam sıcaklığı (T_A)"
              value={f.Ta} onChange={set('Ta')}
              units={['°C']} unit="°C" onUnit={() => {}}
              hint="Kutu içi sıcaklık; oda sıcaklığı değil"
            />
          )}

          <NumberField
            label="Güç kaybı (P)"
            value={f.P} onChange={set('P')}
            units={['W', 'mW', 'kW']} unit={f.Pu} onUnit={set('Pu')}
          />

          {mode === MODE_JUNCTION && (
            <NumberField
              label="Junction–ortam direnci (θ_JA)"
              value={f.thetaJA} onChange={set('thetaJA')}
              units={['°C/W']} unit="°C/W" onUnit={() => {}}
              hint="Katalog değeri üreticinin test kartına aittir"
            />
          )}

          {mode === MODE_HEATSINK && (
            <>
              <NumberField
                label="Junction–case direnci (θ_JC)"
                value={f.thetaJC} onChange={set('thetaJC')}
                units={['°C/W']} unit="°C/W" onUnit={() => {}}
              />
              <NumberField
                label="Case–soğutucu direnci (θ_CS)"
                value={f.thetaCS} onChange={set('thetaCS')}
                units={['°C/W']} unit="°C/W" onUnit={() => {}}
                hint="Termal arayüz malzemesi; montaj basıncına bağlıdır"
              />
              <NumberField
                label="Seçilen soğutucu direnci (θ_SA) — opsiyonel"
                value={f.thetaSA} onChange={set('thetaSA')}
                units={['°C/W']} unit="°C/W" onUnit={() => {}}
                hint="Girilirse T_J, marj ve yol payları da hesaplanır"
              />
            </>
          )}

          <NumberField
            label={mode === MODE_SURFACE
              ? 'İzin verilen junction sıcaklığı (T_J,max) — opsiyonel'
              : 'İzin verilen junction sıcaklığı (T_J,max)'}
            value={f.TjMax} onChange={set('TjMax')}
            units={['°C']} unit="°C" onUnit={() => {}}
          />

          <SelectField
            label="Bakır termal ağı (kart üzeri yayılım)"
            value={f.copper} onChange={set('copper')}
            options={COPPER_OPTIONS.map((c) => ({ value: c, label: COPPER_LABEL[c] }))}
            hint="Bakır şerit ile dielektriği paralel iki iletim yolu olarak ekler"
          />

          {copperOn && (
            <>
              <NumberField
                label="Bakır şerit uzunluğu (L)"
                value={f.Lcu} onChange={set('Lcu')}
                units={DIM_UNITS} unit={f.Lcuu} onUnit={set('Lcuu')}
              />
              <NumberField
                label="Bakır şerit genişliği (W)"
                value={f.Wcu} onChange={set('Wcu')}
                units={DIM_UNITS} unit={f.Wcuu} onUnit={set('Wcuu')}
              />
              <NumberField
                label="Bakır kalınlığı (t)"
                value={f.tcu} onChange={set('tcu')}
                units={DIM_UNITS} unit={f.tcuu} onUnit={set('tcuu')}
              />
              <NumberField
                label="Dielektrik kalınlığı (H)"
                value={f.Hdi} onChange={set('Hdi')}
                units={DIM_UNITS} unit={f.Hdiu} onUnit={set('Hdiu')}
              />
              <NumberField
                label="Dielektrik alanı (A)"
                value={f.area} onChange={set('area')}
                units={AREA_UNITS} unit={f.areau} onUnit={set('areau')}
                hint="Isının dielektrik üzerinden geçtiği yüzey alanı"
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
              <p className="empty-note">{reasonText(r.reason)}</p>
            )
          ) : (
            <>
              <div className="big-result">
                <div className="label">
                  {r.mode === MODE_JUNCTION && 'Junction sıcaklığı'}
                  {r.mode === MODE_HEATSINK && (r.hasSink ? 'Junction sıcaklığı' : 'Gereken maksimum soğutucu direnci')}
                  {r.mode === MODE_SURFACE && 'Tahmini junction sıcaklığı'}
                </div>
                <div className="value">
                  {r.mode === MODE_HEATSINK && !r.hasSink
                    ? <>{fmt(r.thetaSAmax, 4)} °C/W</>
                    : <>{fmt(r.Tj, 4)} °C</>}
                </div>
                <div className="alt">
                  {r.mode === MODE_JUNCTION && (
                    <>ortam {fmt(r.Ta, 4)} °C &nbsp;·&nbsp; artış P·θ_JA = {fmt(r.rise, 4)} °C</>
                  )}
                  {r.mode === MODE_HEATSINK && (r.hasSink
                    ? <>θ_SA,max = {fmt(r.thetaSAmax, 4)} °C/W &nbsp;·&nbsp; toplam yol {fmt(r.thetaTotal, 4)} °C/W</>
                    : <>termal bütçe {fmt(r.budget, 4)} °C/W &nbsp;·&nbsp; θ_JC {fmt(r.thetaJC, 4)} · θ_CS {fmt(r.thetaCS, 4)} °C/W</>)}
                  {r.mode === MODE_SURFACE && (
                    <>{METRIC_SHORT[r.metric]} ile ölçülen {fmt(r.Tsurface, 4)} °C üzerine {fmt(r.rise, 4)} °C</>
                  )}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              {r.mode === MODE_JUNCTION && <p className="method-note">{THETA_NOTE}</p>}
              {r.mode === MODE_SURFACE && <p className="method-note">{PSI_NOTE}</p>}
              {r.copperOn && <p className="method-note">{FIRST_ORDER_NOTE}</p>}

              <table className="result-table">
                <tbody>
                  {r.mode === MODE_JUNCTION && (
                    <>
                      <tr>
                        <td>Junction sıcaklığı (T_J)</td>
                        <td>{fmt(r.Tj, 5)} °C</td>
                      </tr>
                      <tr>
                        <td>Sıcaklık artışı (P·θ_JA)</td>
                        <td>{fmt(r.rise, 5)} °C</td>
                      </tr>
                      <tr>
                        <td>İzin verilen sıcaklık (T_J,max)</td>
                        <td>{fmt(r.TjMax, 5)} °C</td>
                      </tr>
                      <tr>
                        <td>Marj</td>
                        <td>{fmt(r.margin, 5)} °C</td>
                      </tr>
                      <tr>
                        <td>Maksimum güç (P_max)</td>
                        <td>{fmtWatt(r.Pmax)}</td>
                      </tr>
                      <tr>
                        <td>Kullanım oranı</td>
                        <td>%{fmt(r.utilisation * 100, 4)}</td>
                      </tr>
                    </>
                  )}

                  {r.mode === MODE_HEATSINK && (
                    <>
                      <tr>
                        <td>Termal bütçe (T_J,max − T_A)/P</td>
                        <td>{fmt(r.budget, 5)} °C/W</td>
                      </tr>
                      <tr>
                        <td>Gereken θ_SA,max</td>
                        <td>{fmt(r.thetaSAmax, 5)} °C/W</td>
                      </tr>
                      <tr>
                        <td>Junction–case (θ_JC)</td>
                        <td>{fmt(r.thetaJC, 5)} °C/W</td>
                      </tr>
                      <tr>
                        <td>Case–soğutucu (θ_CS)</td>
                        <td>{fmt(r.thetaCS, 5)} °C/W</td>
                      </tr>
                      {r.hasSink && (
                        <>
                          <tr>
                            <td>Toplam yol (θ_JC + θ_CS + θ_SA)</td>
                            <td>{fmt(r.thetaTotal, 5)} °C/W</td>
                          </tr>
                          <tr>
                            <td>Junction sıcaklığı (T_J)</td>
                            <td>{fmt(r.Tj, 5)} °C</td>
                          </tr>
                          <tr>
                            <td>Marj</td>
                            <td>{fmt(r.margin, 5)} °C</td>
                          </tr>
                          <tr className="mini-head">
                            <td>Yol payları</td>
                            <td>θ_JC · θ_CS · θ_SA</td>
                          </tr>
                          <tr>
                            <td>Toplam dirençteki pay</td>
                            <td>
                              %{fmt(r.shares.jc * 100, 3)} · %{fmt(r.shares.cs * 100, 3)} · %{fmt(r.shares.sa * 100, 3)}
                            </td>
                          </tr>
                        </>
                      )}
                    </>
                  )}

                  {r.mode === MODE_SURFACE && (
                    <>
                      <tr>
                        <td>Tahmini junction sıcaklığı (T_J)</td>
                        <td>{fmt(r.Tj, 5)} °C</td>
                      </tr>
                      <tr>
                        <td>Kullanılan metrik</td>
                        <td>{METRIC_SHORT[r.metric]}</td>
                      </tr>
                      <tr>
                        <td>Metrik değeri (Ψ)</td>
                        <td>{fmt(r.psi, 5)} °C/W</td>
                      </tr>
                      <tr>
                        <td>Artış (Ψ·P)</td>
                        <td>{fmt(r.rise, 5)} °C</td>
                      </tr>
                      <tr>
                        <td>Ölçülen sıcaklık</td>
                        <td>{fmt(r.Tsurface, 5)} °C</td>
                      </tr>
                    </>
                  )}

                  {r.copperOn && r.copper && (
                    <>
                      <tr className="mini-head">
                        <td>Bakır termal ağı</td>
                        <td>ilk derece tahmin</td>
                      </tr>
                      <tr>
                        <td>Bakır şerit (R_θ)</td>
                        <td>{fmt(r.copper.strip.Rth, 5)} °C/W</td>
                      </tr>
                      <tr>
                        <td>Dielektrik (R_θ)</td>
                        <td>{fmt(r.copper.dielectric.Rth, 5)} °C/W</td>
                      </tr>
                      <tr>
                        <td>Paralel eşdeğer (R_θ,eq)</td>
                        <td>{fmt(r.copper.eq.Rth, 5)} °C/W</td>
                      </tr>
                      <tr>
                        <td>Yolların payı (bakır · dielektrik)</td>
                        <td>
                          %{fmt(r.copper.eq.shares[0] * 100, 3)} · %{fmt(r.copper.eq.shares[1] * 100, 3)}
                        </td>
                      </tr>
                      <tr>
                        <td>Sıcaklık artışı (ΔT = P·R_θ,eq)</td>
                        <td>{fmt(r.copper.rise.deltaT, 5)} °C</td>
                      </tr>
                    </>
                  )}
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

          <pre className="formula">{FORMULA[mode]}</pre>
          {copperOn && <pre className="formula">{COPPER_FORMULA}</pre>}

          {r.ok && (
            <ul className="detail-list">
              {r.mode === MODE_JUNCTION && (
                <li>
                  Eğrinin eğimi θ_JA = {fmt(r.thetaJA, 4)} °C/W: her watt {fmt(r.thetaJA, 4)} °C
                  artış demektir. Marj {fmt(r.margin, 4)} °C, kullanım oranı
                  %{fmt(r.utilisation * 100, 4)}.
                </li>
              )}
              {r.mode === MODE_HEATSINK && (
                <li>
                  Termal bütçe {fmt(r.budget, 4)} °C/W; paket ve arayüz bunun
                  {' '}{fmt(r.thetaJC, 4)} + {fmt(r.thetaCS, 4)} °C/W kadarını harcıyor, soğutucuya
                  {' '}{fmt(r.thetaSAmax, 4)} °C/W kalıyor.
                </li>
              )}
              {r.mode === MODE_SURFACE && (
                <li>
                  Kullanılan metrik {METRIC_SHORT[r.metric]}. Motorun sonucu bunun bir yol direnci
                  olmadığını taşır; θ_JC ile yer değiştiremez.
                </li>
              )}
              {r.copperOn && r.copper && (
                <li>
                  Bakır şerit iletkenliği {fmt(r.copper.strip.k, 4)} W/(m·K), dielektrik
                  {' '}{fmt(r.copper.dielectric.k, 4)} W/(m·K). Kesit
                  {' '}{fmtEng(r.copper.strip.W, 'm', 3)} × {fmtEng(r.copper.strip.t, 'm', 3)},
                  dielektrik alanı {fmt(fromSI(r.copper.dielectric.area, 'mm²', AREA), 4)} mm².
                </li>
              )}
              <li>
                Sıcaklık farkı üzerinden çalışıldığı için °C ve K aynı sonucu verir; termal
                dirençte °C/W ile K/W aynı büyüklüktür.
              </li>
              <li>Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.</li>
            </ul>
          )}

          <h2 className="section">Geçerlilik ve varsayımlar</h2>
          <ul className="detail-list">
            <li>
              <strong>θ_JA paketin değişmez özelliği değildir.</strong> Test PCB'si, bakır alanı,
              hava akışı ve montaj şartlarından etkilenir; katalog değeri üreticinin test kartına
              aittir. Kendi yığınınızda ölçülen değer farklı çıkacaktır.
            </li>
            <li>
              <strong>Ψ ve θ aynı şey değildir.</strong> θ_JC tek boyutlu bir yol direncidir;
              Ψ_JT paketten kaçan ısının yalnızca bir kısmını gören ampirik bir metriktir. Paket
              üstünden ölçüm yapıldığında θ_JC doğrudan kullanılmaz.
            </li>
            <li>
              θ_SA,max negatif çıkarsa hiçbir soğutucu yetmez: bütçe paket ve arayüzde tükenmiştir.
              Çözüm gücü azaltmak, hava akışını artırmak veya farklı paket seçmektir.
            </li>
            <li>{MARGIN_THRESHOLD_NOTE}</li>
            <li>
              Bakır termal ağı sonucu ilk derece termal ağ tahminidir; yalnızca iletim modellenir.
              Konveksiyon, radyasyon, iki boyutlu yayılım, paket iç yapısı ve komşu ısı kaynakları
              modelde yoktur.
            </li>
            <li>
              <strong>Tüm modeller kararlı haldir.</strong> Geçici ısınma modellenmez: termal
              kütlenin gecikmesi, darbeli yük altındaki tepe sıcaklık ve ısınma zaman sabiti bu
              ekranda hesaplanmaz. Kısa süreli tepe güçler burada görünmez.
            </li>
            <li>
              Termal dirençler tek boyutlu ve doğrusal kabul edilir; sıcaklıkla değişen malzeme
              iletkenliği ve konveksiyonun sıcaklık farkına bağlılığı hesaba katılmaz.
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
                { label: 'T_J', tone: toneClass(0), kind: 'line' },
                ...s.refs.map(() => ({ label: 'T_J,max', tone: 'tone-muted', kind: 'line' })),
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
                label: `T_J,max ${fmt(ref.y, 4)} °C`,
              }))}
              marker={{ ...s.marker, label: 'çalışma noktası' }}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => fmt(v, 4)}
              caption={chartMeta.caption}
            />

            <ChartDataTable
              xLabel={chartMeta.x}
              series={chartSeries}
              every={6}
              formatX={chartX}
              formatY={(v) => `${fmt(v, 4)} °C`}
            />
          </>
        ) : (
          <p className="empty-note">{chartEmpty(r)}</p>
        )}
      </section>

    </>
  )
}
