import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import Segmented from '../../../components/Segmented'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import useToolForm from '../../../hooks/useToolForm'
import { fmt, fmtEng, THOUSANDS_MESSAGE } from '../../../lib/num'
import FrequencySchematic from './schematic'
import {
  INITIAL_FORM, SOURCES, SOURCE_FREQUENCY, SOURCE_PERIOD,
  FREQ_UNITS, TIME_UNITS, compute, buildSweep,
} from './model'
import { SOURCE_LABEL, MAIN_LABEL, CHART, reasonText, commentary } from './text'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }

export default function FrequencyConverter() {
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

  const chartSeries = s ? [{ key: 'period', name: 'T', tone: toneClass(0), points: s.points }] : []

  return (
    <>
      <div className="tool-header">
        <h1>Frequency & Period Converter</h1>
        <p>
          Frekans ile periyot arasında çift yönlü çevirir: frekans girilirse periyodu, periyot
          girilirse frekansı verir. Sonucu her iki büyüklüğün tüm birim karşılıklarıyla ve
          açısal frekansla birlikte gösterir.
        </p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>Girdiler</h2>

          <FrequencySchematic r={r} />

          <Segmented
            value={f.source}
            onChange={set('source')}
            options={SOURCES.map((x) => ({ value: x, label: SOURCE_LABEL[x] }))}
          />

          {f.source === SOURCE_PERIOD ? (
            <NumberField
              label="Periyot (T)"
              value={f.period} onChange={set('period')}
              units={TIME_UNITS} unit={f.periodu} onUnit={set('periodu')}
              hint="Bir tam çevrimin süresi. Kenar süresi (t_r) ile karıştırmayın"
            />
          ) : (
            <NumberField
              label="Frekans (f)"
              value={f.freq} onChange={set('freq')}
              units={FREQ_UNITS} unit={f.frequ} onUnit={set('frequ')}
              hint="Birim zamandaki çevrim sayısı. Sıfır ve negatif değer kabul edilmez"
            />
          )}
        </section>

        {/* ---------- Orta: Sonuç ---------- */}
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
                <div className="label">{MAIN_LABEL[r.source]}</div>
                <div className="value">
                  {r.source === SOURCE_FREQUENCY
                    ? fmtEng(r.period, 's', 4)
                    : fmtEng(r.frequency, 'Hz', 4)}
                </div>
                <div className="alt">
                  {r.source === SOURCE_FREQUENCY
                    ? `f = ${fmtEng(r.frequency, 'Hz', 4)}`
                    : `T = ${fmtEng(r.period, 's', 4)}`}
                  &nbsp;·&nbsp; ω = {fmtEng(r.omega, 'rad/s', 4)}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr className="mini-head"><td>Frekans</td><td>birim karşılıkları</td></tr>
                  {r.freqRows.map((row) => (
                    <tr key={row.unit}>
                      <td>{row.unit}</td>
                      <td>{fmt(row.value, 6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h2 className="section">Periyot</h2>
              <table className="result-table">
                <tbody>
                  <tr className="mini-head"><td>Periyot</td><td>birim karşılıkları</td></tr>
                  {r.timeRows.map((row) => (
                    <tr key={row.unit}>
                      <td>{row.unit}</td>
                      <td>{fmt(row.value, 6)}</td>
                    </tr>
                  ))}
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

          <pre className="formula">{`Frekans ve periyot:
  f = 1 / T
  T = 1 / f

Açısal frekans:
  ω = 2π·f  (rad/s)
  f = ω / (2π)

Birim çarpanları:
  1 kHz = 1e3 Hz
  1 MHz = 1e6 Hz
  1 GHz = 1e9 Hz

  1 ms = 1e-3 s
  1 µs = 1e-6 s
  1 ns = 1e-9 s
  1 ps = 1e-12 s`}</pre>

          {r.ok && (
            <ul className="detail-list">
              <li>
                Girilen büyüklük:{' '}
                {r.source === SOURCE_FREQUENCY
                  ? `f = ${fmtEng(r.frequency, 'Hz', 6)}`
                  : `T = ${fmtEng(r.period, 's', 6)}`}{' '}
                — birim çarpanıyla SI'ye çevrilerek okundu.
              </li>
              <li>
                Türetilen büyüklük:{' '}
                {r.source === SOURCE_FREQUENCY
                  ? `T = 1/f = ${fmtEng(r.period, 's', 6)}`
                  : `f = 1/T = ${fmtEng(r.frequency, 'Hz', 6)}`}.
              </li>
              <li>Açısal frekans: ω = 2π·f = {fmtEng(r.omega, 'rad/s', 6)}.</li>
              <li>Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.</li>
            </ul>
          )}

          <h2 className="section">Geçerlilik ve varsayımlar</h2>
          <ul className="detail-list">
            <li>
              Dönüşüm tanım gereği tamdır; f = 1/T bir yaklaşıklık değildir. Tek sınırlama
              gösterimdeki anlamlı basamak ve kayan nokta hassasiyetidir.
            </li>
            <li>
              Periyot, tekrarlayan bir sinyalin bir tam çevriminin süresidir. Tek bir darbenin
              genişliği ya da kenarın yükselme süresi periyot değildir.
            </li>
            <li>
              Sıfır ve negatif giriş kabul edilmez: f = 0 (DC) için periyot tanımlı değildir ve
              negatif bir tekrar süresi yoktur.
            </li>
            <li>
              Açısal frekans radyan/saniye taşır. 2π çarpanı atlanırsa faz ve reaktans hesapları
              bir 6.283 katsayısı kadar yanlış çıkar.
            </li>
            <li>
              Sapma yalnızca gösterim yuvarlamasından gelir; hesap tam değerle yapılır,
              yuvarlama son adımda uygulanır.
            </li>
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
            <ChartLegend items={[{ label: 'periyot', tone: toneClass(0), kind: 'line' }]} />

            <LineChart
              xScale="log"
              xLabel={CHART.x}
              yLabel={CHART.y}
              series={chartSeries}
              marker={{ ...s.marker, label: 'seçilen' }}
              formatX={(v) => fmtEng(v, 'Hz', 3)}
              formatY={(v) => fmtEng(v, 's', 3)}
              caption={CHART.caption}
            />

            <ChartDataTable
              xLabel={CHART.x}
              series={chartSeries}
              every={10}
              formatX={(v) => fmtEng(v, 'Hz', 4)}
              formatY={(v) => fmtEng(v, 's', 4)}
            />
          </>
        ) : (
          <p className="empty-note">Grafik için geçerli girdi gerekli.</p>
        )}
      </section>

      <Link className="backlink" to="/kategori/uretim-dfm">← PCB Üretim, DFM ve Dönüşümler</Link>
    </>
  )
}
