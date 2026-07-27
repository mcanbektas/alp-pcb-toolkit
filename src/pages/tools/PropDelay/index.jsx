import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import EpsEffFields, { epsEffRows } from '../../../components/EpsEffFields'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import useToolForm from '../../../hooks/useToolForm'
import { fmt, fmtEng, THOUSANDS_MESSAGE } from '../../../lib/num'
import WaveSchematic from './schematic'
import { INITIAL_FORM, compute, buildSweep } from './model'
import { CHART, reasonText, commentary } from './text'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }

const FORMULA = `t'_pd = √εeff / c
  (birim uzunluk gecikmesi)
t_pd = L · √εeff / c

Pratik:
  t'_pd ≈ 3.33564·√εeff ps/mm

v_p = c / √εeff

λ₀ = c / f
λg = c / (f·√εeff)

λ/4 = λg / 4
λ/2 = λg / 2

Elektriksel uzunluk:
  derece = 360°·(L / λg)
  radyan = 2π·(L / λg)`

export default function PropDelay() {
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

  const chartSeries = s ? [{ key: 'deg', name: 'elektriksel uzunluk', tone: toneClass(0), points: s.points }] : []

  return (
    <>
      <div className="tool-header">
        <h1>Propagation Delay &amp; Wavelength</h1>
        <p>
          Hattın birim uzunluk gecikmesini, toplam gecikmesini, yayılma hızını ve kart üzerindeki
          dalga boyunu hesaplar; hattın elektriksel uzunluğunu derece cinsinden verir.
        </p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>Girdiler</h2>

          <WaveSchematic r={r} />

          <EpsEffFields f={f} set={set} />

          <NumberField
            label="Hat uzunluğu"
            value={f.length} onChange={set('length')}
            units={['mm', 'cm', 'm', 'mil', 'inch']} unit={f.lengthu} onUnit={set('lengthu')}
          />

          <NumberField
            label="Frekans"
            value={f.freq} onChange={set('freq')}
            units={['Hz', 'kHz', 'MHz', 'GHz']} unit={f.frequ} onUnit={set('frequ')}
            hint="Dalga boyu ve elektriksel uzunluk bu frekansta hesaplanır"
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
                <div className="label">Birim uzunluk gecikmesi</div>
                <div className="value">{fmt(r.tpdPsPerMm, 4)} ps/mm</div>
                <div className="alt">
                  toplam {fmtEng(r.delay, 's', 4)} &nbsp;·&nbsp; {fmt(r.degrees, 4)}° elektriksel uzunluk
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  {epsEffRows(r.eps, fmt).map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      <td>{row.value}</td>
                    </tr>
                  ))}
                  <tr>
                    <td>Birim uzunluk gecikmesi</td>
                    <td>{fmt(r.tpdPsPerMm, 5)} ps/mm</td>
                  </tr>
                  <tr>
                    <td>Toplam gecikme</td>
                    <td>{fmtEng(r.delay, 's', 5)}</td>
                  </tr>
                  <tr>
                    <td>Yayılma hızı</td>
                    <td>{fmtEng(r.vp, 'm/s', 5)}</td>
                  </tr>
                  <tr>
                    <td>Havada dalga boyu (λ₀)</td>
                    <td>{fmtEng(r.lambda0, 'm', 5)}</td>
                  </tr>
                  <tr>
                    <td>Kartta dalga boyu (λg)</td>
                    <td>{fmtEng(r.lambdaG, 'm', 5)}</td>
                  </tr>
                  <tr>
                    <td>Çeyrek dalga (λ/4)</td>
                    <td>{fmtEng(r.quarter, 'm', 5)}</td>
                  </tr>
                  <tr>
                    <td>Yarım dalga (λ/2)</td>
                    <td>{fmtEng(r.half, 'm', 5)}</td>
                  </tr>
                  <tr>
                    <td>Elektriksel uzunluk</td>
                    <td>{fmt(r.degrees, 5)}° · {fmt(r.radians, 5)} rad</td>
                  </tr>
                  <tr>
                    <td>Dalga boyuna oran</td>
                    <td>{fmt(r.fraction, 5)} λ</td>
                  </tr>
                  <tr>
                    <td>Bu uzunluğun çeyrek dalga frekansı</td>
                    <td>{fmtEng(r.quarterWaveFreq, 'Hz', 5)}</td>
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
                εeff kaynağı: {r.eps.source === 'geometry'
                  ? `geometriden hesaplandı (${r.eps.model}, yöntem \`${r.eps.method}\`)`
                  : 'elle girildi'}.
              </li>
              <li>√εeff = {fmt(Math.sqrt(r.eps.epsEff), 5)}; gecikme bu çarpanla ölçeklenir.</li>
              <li>Pratik yaklaşım katsayısı 3.33564 aslında 1e9/c değerinin yuvarlanmışıdır.</li>
              <li>Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.</li>
            </ul>
          )}

          <h2 className="section">Geçerlilik ve varsayımlar</h2>
          <ul className="detail-list">
            <li>
              Hat kayıpsız ve dispersiyonsuz kabul edilir; tüm frekans bileşenleri aynı hızda
              ilerler.
            </li>
            <li>
              Dielektrik sabiti frekanstan bağımsız alınır. Gerçek Dk frekansla düşer ve geniş
              bantlı sinyalde tek değer yetmez.
            </li>
            <li>
              Microstrip'te alan kısmen havada ilerler; εeff bu yüzden εr'den küçüktür ve
              geometriye bağlıdır. Stripline'da homojen dielektrik nedeniyle εeff = εr.
            </li>
            <li>Via geçişleri, konnektör ve pad süreksizlikleri gecikmeye eklenmez.</li>
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
                { label: 'elektriksel uzunluk', tone: toneClass(0), kind: 'line' },
                { label: 'çeyrek dalga (90°)', tone: 'tone-muted', kind: 'line' },
                { label: 'yarım dalga (180°)', tone: 'tone-muted', kind: 'line' },
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
                label: ref.key === 'quarter' ? 'λ/4 — 90°' : 'λ/2 — 180°',
              }))}
              marker={{ ...s.marker, label: 'çalışma frekansı' }}
              formatX={(v) => fmtEng(v, '', 3).replace(' ', '')}
              formatY={(v) => fmt(v, 3)}
              caption={CHART.caption}
            />

            <ChartDataTable
              xLabel={CHART.x}
              series={chartSeries}
              every={6}
              formatX={(v) => fmtEng(v, 'Hz', 4)}
              formatY={(v) => `${fmt(v, 4)}°`}
            />
          </>
        ) : (
          <p className="empty-note">Grafik için geçerli girdi gerekli.</p>
        )}
      </section>

      <Link className="backlink" to="/kategori/sinyal-butunlugu">← Sinyal Bütünlüğü</Link>
    </>
  )
}
