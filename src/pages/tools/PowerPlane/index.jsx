import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import RowList from '../../../components/RowList'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import useToolForm from '../../../hooks/useToolForm'
import {
  fmt, fmtEng, fmtOhm, fmtAmp, fmtVolt, fmtPow, THOUSANDS_MESSAGE,
} from '../../../lib/num'
import { OZ_TABLE } from '../../../lib/traceCalc'
import PlaneSchematic from './schematic'
import {
  INITIAL_FORM, TOOLS, TOOL_PLANE, TOOL_PARALLEL, TRACE_COLUMNS,
  compute, buildSweep,
} from './model'
import { TOOL_LABEL, CHART, reasonText, commentary } from './text'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }

const FORMULA = {
  [TOOL_PLANE]: `R_□ = ρ(T) / t   (kare direnci)
R = R_□ · (L / W)   (kare sayısı)

ρ(T) = ρ₂₀·[1 + α(T − 20)]
  ρ₂₀ = 1.724×10⁻⁸ Ω·m
  α = 0.00393 /°C

V_düşüm = I·R   P = I²·R`,
  [TOOL_PARALLEL]: `Rᵢ = ρ(T)·Lᵢ / (Wᵢ·t)
R_eş = (Σ 1/Rᵢ)⁻¹

Akım payı:
  Iᵢ = I · (1/Rᵢ) / Σ(1/Rⱼ)

Eşit geometride: Iᵢ = I / n`,
}

export default function PowerPlane() {
  const { f, set } = useToolForm(INITIAL_FORM)

  const r = useMemo(() => compute(f.tool, f), [f])
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

  const isPlane = f.tool === TOOL_PLANE
  const chartMeta = s ? CHART[s.kind] : null
  const chartSeries = s
    ? [{ key: 'main', name: chartMeta.y, tone: toneClass(0), points: s.points }]
    : []

  return (
    <>
      <div className="tool-header">
        <h1>Power Plane &amp; Parallel Trace</h1>
        <p>
          Güç düzleminin boyun ve ortalama geometrisi için direnci, gerilim düşümünü ve güç
          kaybını; paralel yollarda ise akım paylaşımını ve en yüklü kolu hesaplar.
        </p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>Girdiler</h2>

          <PlaneSchematic r={r} form={f} />

          <SelectField
            label="Hesap"
            value={f.tool} onChange={set('tool')}
            options={TOOLS.map((t) => ({ value: t, label: TOOL_LABEL[t] }))}
          />

          <NumberField
            label="Toplam akım (I)"
            value={f.I} onChange={set('I')}
            units={['A', 'mA']} unit={f.Iu} onUnit={set('Iu')}
          />

          {isPlane ? (
            <>
              <NumberField
                label="Akım yolu uzunluğu (L)"
                value={f.L} onChange={set('L')}
                units={['mm', 'cm', 'mil', 'inch']} unit={f.Lu} onUnit={set('Lu')}
                hint="Kaynaktan yüke bakır üzerinden gidilen yol"
              />
              <NumberField
                label="Ortalama düzlem genişliği"
                value={f.Wavg} onChange={set('Wavg')}
                units={['mm', 'mil']} unit={f.Wavgu} onUnit={set('Wavgu')}
              />
              <NumberField
                label="Minimum boyun genişliği"
                value={f.Wneck} onChange={set('Wneck')}
                units={['mm', 'mil']} unit={f.Wnecku} onUnit={set('Wnecku')}
                hint="Poligonun en dar yeri — direncin çoğu burada oluşur"
              />
            </>
          ) : (
            <RowList
              label="Paralel yollar"
              rows={f.traces}
              columns={TRACE_COLUMNS}
              onChange={set('traces')}
              rowLabel="Yol"
              addLabel="Yol ekle"
              hint="Farklı uzunluk ve genişlikteki kollar akımı eşit paylaşmaz"
            />
          )}

          <SelectField
            label="Bakır kalınlığı"
            value={f.oz} onChange={set('oz')}
            options={OZ_TABLE.map((o) => ({ value: o.key, label: o.label }))}
          />

          {f.oz === 'custom' && (
            <NumberField
              label="Özel bakır kalınlığı"
              value={f.tCustom} onChange={set('tCustom')}
              units={['µm']} unit="µm" onUnit={() => {}}
            />
          )}

          <SelectField
            label="Katman"
            value={f.layer} onChange={set('layer')}
            options={[
              { value: 'external', label: 'Dış katman' },
              { value: 'internal', label: 'İç katman' },
            ]}
          />

          <NumberField
            label="Çalışma sıcaklığı"
            value={f.T} onChange={set('T')}
            units={['°C']} unit="°C" onUnit={() => {}}
            hint="Özdirenç bu sıcaklığa göre düzeltilir"
          />

          <NumberField
            label="Besleme gerilimi (opsiyonel)"
            value={f.Vs} onChange={set('Vs')}
            units={['V', 'mV']} unit={f.Vsu} onUnit={set('Vsu')}
            hint="Girilirse yüzdesel gerilim düşümü gösterilir"
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
              <p className="empty-note">{reasonText(r.reason, r)}</p>
            )
          ) : isPlane ? (
            <>
              <div className="big-result">
                <div className="label">Boyun bölgesi direnci</div>
                <div className="value">{fmtOhm(r.neck.R)}</div>
                <div className="alt">
                  ortalama geometri: {fmtOhm(r.average.R)} &nbsp;·&nbsp; oran {fmt(r.neckFactor, 3)}×
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr className="mini-head">
                    <td>Geometri</td>
                    <td>boyun · ortalama</td>
                  </tr>
                  <tr>
                    <td>Direnç</td>
                    <td>{fmtOhm(r.neck.R)} · {fmtOhm(r.average.R)}</td>
                  </tr>
                  <tr>
                    <td>Kare sayısı</td>
                    <td>{fmt(r.neck.squares, 3)} · {fmt(r.average.squares, 3)}</td>
                  </tr>
                  <tr>
                    <td>Gerilim düşümü</td>
                    <td>{fmtVolt(r.neck.Vdrop)} · {fmtVolt(r.average.Vdrop)}</td>
                  </tr>
                  <tr>
                    <td>Güç kaybı</td>
                    <td>{fmtPow(r.neck.Ploss, 3)} · {fmtPow(r.average.Ploss, 3)}</td>
                  </tr>
                  <tr>
                    <td>Akım yoğunluğu</td>
                    <td>{fmt(r.neck.J / 1e6, 3)} · {fmt(r.average.J / 1e6, 3)} A/mm²</td>
                  </tr>
                  {r.neck.pct != null && (
                    <tr>
                      <td>Beslemeye oranı</td>
                      <td>%{fmt(r.neck.pct, 3)} · %{fmt(r.average.pct, 3)}</td>
                    </tr>
                  )}
                  <tr>
                    <td>Kare direnci</td>
                    <td>{fmtOhm(r.Rsheet)}/□</td>
                  </tr>
                  <tr>
                    <td>Boyun akım kapasitesi</td>
                    <td>
                      {fmtAmp(r.neckCapacity, 3)}{' '}
                      <span className="sub">(%{fmt(r.neckUtil * 100, 3)} kullanım)</span>
                    </td>
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
          ) : (
            <>
              <div className="big-result">
                <div className="label">Eşdeğer direnç</div>
                <div className="value">{fmtOhm(r.Req)}</div>
                <div className="alt">
                  {r.branches.length} kol &nbsp;·&nbsp; toplam düşüm {fmtVolt(r.Vdrop)}
                  {r.pct != null && <> ({fmt(r.pct, 3)} %)</>}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="pick-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Direnç</th>
                    <th>Akım</th>
                    <th>Pay</th>
                    <th>Kapasite</th>
                    <th>Kullanım</th>
                  </tr>
                </thead>
                <tbody>
                  {r.branches.map((b, i) => (
                    <tr key={i} className={b === r.worst ? 'on' : ''}>
                      <td>{i + 1}</td>
                      <td>{fmtOhm(b.R)}</td>
                      <td>{fmtAmp(b.I, 3)}</td>
                      <td>%{fmt(b.share * 100, 3)}</td>
                      <td>{fmtAmp(b.capacity, 3)}</td>
                      <td>
                        %{fmt(b.util * 100, 3)}
                        {b.util > 1 && <span className="flag"> !</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <table className="result-table">
                <tbody>
                  <tr>
                    <td>Toplam güç kaybı</td>
                    <td>{fmtPow(r.Ploss, 3)}</td>
                  </tr>
                  <tr>
                    <td>Eşit pay olsaydı</td>
                    <td>%{fmt(r.equalShare * 100, 3)} · {fmtAmp(r.I / r.branches.length, 3)}</td>
                  </tr>
                  <tr>
                    <td>Eşdeğer tek yol genişliği</td>
                    <td>{fmtEng(r.equivalentW, 'm', 3)}</td>
                  </tr>
                  <tr>
                    <td>Kollara bölünen toplam genişlik</td>
                    <td>{fmtEng(r.totalWidth, 'm', 3)}</td>
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

          <pre className="formula">{FORMULA[f.tool]}</pre>

          {r.ok && (
            <ul className="detail-list">
              <li>Bakır kalınlığı {fmtEng(r.t, 'm', 3)}; kare direnci {fmtOhm(r.Rsheet ?? r.branches[0].Rsheet)}/□ @ {fmt(r.T, 3)} °C.</li>
              {isPlane && (
                <li>
                  Boyun / ortalama genişlik oranı {fmt(r.average.W / r.neck.W, 3)}; direnç oranı da
                  aynıdır çünkü uzunluk ikisinde de eşit alınır.
                </li>
              )}
              {!isPlane && (
                <li>
                  Akım payı iletkenlikle orantılıdır; en düşük dirençli kol en çok akımı çeker.
                </li>
              )}
              <li>Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.</li>
            </ul>
          )}

          <h2 className="section">Geçerlilik ve varsayımlar</h2>
          <ul className="detail-list">
            <li>
              Akımın düzgün bir genişlik boyunca aktığı varsayılır. Geniş poligonda dağılım düzgün
              değildir; boyun ve ortalama sonuçları alt/üst sınır olarak okunmalıdır.
            </li>
            <li>
              Via geçişleri, pad girişleri ve düzlem kesikleri modelde yoktur; hepsi direnci
              artırır.
            </li>
            <li>
              Akım kapasitesi klasik ampirik ısınma denkleminden gelir ve tekil bir iletken içindir.
            </li>
            <li>
              Birbirine yakın paralel yolların ısıl etkileşimi hesaba katılmaz; toplam kapasite
              tek tek kapasitelerin toplamından düşüktür.
            </li>
            <li>Kesit dikdörtgen kabul edilir; aşındırmadan gelen trapez kesit modelde yoktur.</li>
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
                  label: ref.key === 'avg' ? 'ortalama genişlik direnci' : 'mevcut eşdeğer',
                  tone: 'tone-muted',
                  kind: 'line',
                })),
              ]}
            />

            <LineChart
              xScale={isPlane ? 'log' : 'linear'}
              xLabel={chartMeta.x}
              yLabel={chartMeta.y}
              series={chartSeries}
              refLines={s.refs.map((ref) => ({
                key: ref.key,
                y: ref.y,
                label: ref.key === 'avg' ? `ortalama ${fmtOhm(ref.y)}` : `mevcut ${fmtOhm(ref.y)}`,
              }))}
              marker={{ ...s.marker, label: isPlane ? 'boyun' : 'mevcut' }}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => fmtEng(v, '', 3)}
              caption={chartMeta.caption}
            />

            <ChartDataTable
              xLabel={chartMeta.x}
              series={chartSeries}
              every={isPlane ? 6 : 1}
              formatX={(v) => (isPlane ? `${fmt(v, 3)} mm` : `${fmt(v, 2)} kol`)}
              formatY={(v) => fmtOhm(v)}
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
