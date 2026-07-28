import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import EpsEffFields, { epsEffRows } from '../../../components/EpsEffFields'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import useToolForm from '../../../hooks/useToolForm'
import { fmt, fmtEng, THOUSANDS_MESSAGE } from '../../../lib/num'
import { EPS_GEOMETRY } from '../../../lib/epsEff'
import CriticalLengthSchematic from './schematic'
import {
  INITIAL_FORM, DIVISORS, LENGTH_UNITS, RISE_UNITS, K_MIN, K_MAX,
  compute, buildSweep,
} from './model'
import {
  CHART, DIVISOR_LABEL, DIVISOR_SHORT, METHOD_NOTE, LEGACY_METHOD_NOTE, LEVEL_SOURCE_NOTE,
  reasonText, commentary,
} from './text'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }

const FORMULA = `t'_pd = √εeff / c
  (birim uzunluk gecikmesi)
t_d = L · t'_pd
  (hat gecikmesi)

Kriter — N ∈ {6, 4, 2}:
  t_d ≥ t_r / N
    → iletim hattı değerlendirmesi

Kritik uzunluk:
  L_crit = t_r / (N · t'_pd)
         = c · t_r / (N · √εeff)

Oranlar:
  t_d / t_r
    (gecikmenin kenara oranı)
  L / L_crit
    (eşiğe uzaklık)

Yükselme süresi bant genişliği
— yaklaşık bağıntı:
  f_BW = K / t_r , K ∈ [0.35, 0.5]
  (bu değer VERİ HIZI DEĞİLDİR)`

export default function CriticalLength() {
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

  const chartSeries = s
    ? s.series.map((ser, i) => ({
        key: `d${ser.divisor}`,
        name: `1/${ser.divisor}`,
        tone: toneClass(i),
        points: ser.points,
      }))
    : []

  return (
    <>
      <Link className="backlink" to="/kategori/sinyal-butunlugu">← Sinyal Bütünlüğü</Link>

      <div className="tool-header">
        <h1>Critical Trace Length</h1>
        <p>
          Hattın ne zaman iletim hattı gibi ele alınması gerektiğini yükselme süresi kriterinden
          hesaplar; üç kriterin verdiği eşiği karşılaştırır ve girilen hat uzunluğunu eşiğe göre
          değerlendirir.
        </p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>Girdiler</h2>

          <CriticalLengthSchematic r={r} />

          <EpsEffFields f={f} set={set} />

          <NumberField
            label="Yükselme süresi (t_r)"
            value={f.tr} onChange={set('tr')}
            units={RISE_UNITS} unit={f.tru} onUnit={set('tru')}
            hint="Sürücünün gerçek kenar hızı — veri sayfasındaki tipik değer genelde iyimserdir"
          />

          <SelectField
            label="Kriter"
            value={f.divisor} onChange={set('divisor')}
            options={DIVISORS.map((d) => ({ value: String(d), label: DIVISOR_LABEL[d] }))}
            hint="Mutlak sınır değil, tasarım eşiği"
          />

          <NumberField
            label="Bant genişliği katsayısı (K)"
            value={f.k} onChange={set('k')}
            units={['']} unit="" onUnit={() => {}}
            hint={`f_BW = K / t_r — ${fmt(K_MIN, 3)} birinci dereceden sistem, ${fmt(K_MAX, 3)}'e kadar seçilebilir`}
          />

          <NumberField
            label="Hat uzunluğu (isteğe bağlı)"
            value={f.length} onChange={set('length')}
            units={LENGTH_UNITS} unit={f.lengthu} onUnit={set('lengthu')}
            hint="Girilirse hat eşiğin üstünde mi diye kontrol edilir"
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
                <div className="label">Kritik hat uzunluğu</div>
                <div className="value">{fmtEng(r.critical, 'm', 4)}</div>
                <div className="alt">
                  kriter {DIVISOR_SHORT[r.divisor] ?? `1/${fmt(r.divisor, 3)}`} &nbsp;·&nbsp;
                  t&apos;_pd = {fmt(r.tpdPsPerMm, 4)} ps/mm
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <p className="method-note">{METHOD_NOTE}</p>
              <p className="method-note">{LEGACY_METHOD_NOTE}</p>
              <p className="method-note">{LEVEL_SOURCE_NOTE}</p>

              <table className="result-table">
                <tbody>
                  <tr>
                    <td>Kritik uzunluk (seçilen kriter)</td>
                    <td>{fmtEng(r.critical, 'm', 5)}</td>
                  </tr>
                  {r.byDivisor.map((b) => (
                    <tr key={b.divisor}>
                      <td>Kriter 1/{fmt(b.divisor, 2)} ile</td>
                      <td>{fmtEng(b.critical, 'm', 5)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td>Birim uzunluk gecikmesi</td>
                    <td>{fmt(r.tpdPsPerMm, 5)} ps/mm</td>
                  </tr>
                  <tr>
                    <td>Yükselme süresi</td>
                    <td>{fmtEng(r.tr, 's', 5)}</td>
                  </tr>
                  <tr>
                    <td>Yükselme süresi bant genişliği (f_BW)</td>
                    <td>{fmtEng(r.bw.fBW, 'Hz', 5)}</td>
                  </tr>
                  <tr>
                    <td>Bant genişliği katsayısı (K)</td>
                    <td>{fmt(r.bw.k, 3)}</td>
                  </tr>
                  {epsEffRows(r.eps, fmt).map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      <td>{row.value}</td>
                    </tr>
                  ))}

                  {r.hasLength && (
                    <>
                      <tr>
                        <td>Hat uzunluğu</td>
                        <td>{fmtEng(r.length, 'm', 5)}</td>
                      </tr>
                      <tr>
                        <td>Hat gecikmesi (t_d)</td>
                        <td>{fmtEng(r.delay, 's', 5)}</td>
                      </tr>
                      <tr>
                        <td>Gecikme / yükselme süresi</td>
                        <td>{fmt(r.delayFraction, 5)}</td>
                      </tr>
                      <tr>
                        <td>Uzunluk / kritik uzunluk</td>
                        <td>{fmt(r.ratio, 5)}</td>
                      </tr>
                      <tr>
                        <td>İletim hattı gibi davranıyor mu</td>
                        <td>{r.transmissionLine ? 'evet — eşiğin üstünde' : 'hayır — eşiğin altında'}</td>
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

          <pre className="formula">{FORMULA}</pre>

          {r.ok && (
            <ul className="detail-list">
              <li>
                εeff kaynağı: {r.eps.source === EPS_GEOMETRY
                  ? `geometriden hesaplandı (${r.eps.model}, yöntem \`${r.eps.method}\`)`
                  : 'elle girildi'}.
              </li>
              <li>√εeff = {fmt(Math.sqrt(r.eps.epsEff), 5)}; kritik uzunluk bu çarpanla ters orantılıdır.</li>
              <li>
                Kritik uzunluk bölenle ters orantılıdır: kriter 1/6&apos;dan 1/2&apos;ye gevşetilirse eşik
                üç katına çıkar. Sayısal karşılığı sonuç tablosundaki üç satırdır.
              </li>
              <li>
                Hat gecikmesi ve kritik uzunluk aynı t&apos;_pd değerinden gelir; εeff&apos;teki sapma
                ikisine de aynı yönde geçer, oranları korunur.
              </li>
              <li>
                f_BW yalnızca bilgi amaçlıdır: kritik uzunluk hesabına girmez, ayrı bir yan
                sonuçtur.
              </li>
              <li>Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.</li>
            </ul>
          )}

          <h2 className="section">Geçerlilik ve varsayımlar</h2>
          <ul className="detail-list">
            <li>
              <strong>Kriter eşiktir, sınır değildir.</strong> 1/6, 1/4 ve 1/2 uygulamada
              kullanılan farklı tasarım eşikleridir. Eşiğin altındaki
              hat da fiziksel olarak iletim hattıdır; yalnızca yansımaların etkisi çoğu tasarımda
              ihmal edilebilir kabul edilir.
            </li>
            <li>
              <strong>Uygulanmayan yöntem:</strong> maksimum hat uzunluğu, artık aktif olarak
              sürdürülmeyen bir kılavuza dayanan frekans alanı yöntemiyle de kestirilebilir.
              O yöntem bu araçta uygulanmadı; sonuç yalnızca yükselme süresi kriterinden gelir.
            </li>
            <li>
              <strong>f_BW veri hızı değildir.</strong> K/t_r ifadesi sürücü kenarının kapladığı
              yaklaşık spektrum genişliğidir. Sinyal bütünlüğü açısından belirleyici olan çoğunlukla
              saat frekansı değil, sürücünün yükselme ve düşme süresidir.
            </li>
            <li>
              εeff doğrudan sonuca girer: L_crit ∝ 1/√εeff. εeff elle girildiyse doğruluğu girene
              aittir; kapalı formdan geldiyse alan çözücü sonucu sayılmaz ve sapması buraya taşınır.
            </li>
            <li>
              Hat kayıpsız ve dispersiyonsuz kabul edilir; tüm frekans bileşenleri aynı hızda
              ilerler. Kenar, hat boyunca yavaşlamıyor varsayılır.
            </li>
            <li>
              Via geçişleri, konnektör, pad ve stub süreksizlikleri gecikmeye eklenmez. Dallanmış
              (multi-drop) topolojide en uzun dal ayrı değerlendirilmelidir.
            </li>
            <li>
              Yükselme süresi olarak sürücünün en hızlı kenarı kullanılmalıdır; hızlı köşe
              koşulunda kenar keskinleşir ve eşik kısalır.
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
                ...s.series.map((ser, i) => ({
                  label: `kriter 1/${ser.divisor}`,
                  tone: toneClass(i),
                  kind: 'line',
                })),
                ...s.refs.map(() => ({ label: 'hat uzunluğu', tone: 'tone-muted', kind: 'line' })),
              ]}
            />

            <LineChart
              xScale="log"
              xLabel={CHART.x}
              yLabel={CHART.y}
              series={chartSeries}
              refLines={s.refs.map((ref) => ({
                key: ref.key,
                y: ref.y,
                label: `hat uzunluğu ${fmt(ref.y, 3)} mm`,
              }))}
              marker={{ ...s.marker, label: 'çalışma noktası' }}
              formatX={(v) => fmtEng(v, '', 3).replace(' ', '')}
              formatY={(v) => fmt(v, 3)}
              caption={CHART.caption}
            />

            <ChartDataTable
              xLabel={CHART.x}
              series={chartSeries}
              every={6}
              formatX={(v) => fmtEng(v, 's', 4)}
              formatY={(v) => `${fmt(v, 4)} mm`}
            />
          </>
        ) : (
          <p className="empty-note">Grafik için geçerli girdi gerekli.</p>
        )}
      </section>

    </>
  )
}
