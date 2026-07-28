import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import Segmented from '../../../components/Segmented'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import useToolForm from '../../../hooks/useToolForm'
import { fmt, fmtEng, fmtPow, THOUSANDS_MESSAGE } from '../../../lib/num'
import ThermalViaSchematic from './schematic'
import { INITIAL_FORM, MODE_ANALYSIS, MODE_SYNTHESIS, compute, buildSweep } from './model'
import { CHART, reasonText, commentary } from './text'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }
const DIA_UNITS = ['mm', 'µm', 'mil']

export default function ThermalVia() {
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

  const chartSeries = s ? [{ key: 'rth', name: 'R_θ dizi', tone: toneClass(0), points: s.points }] : []

  return (
    <>
      <Link className="backlink" to="/kategori/via-padstack">← Via ve Padstack</Link>

      <div className="tool-header">
        <h1>Thermal Via Array</h1>
        <p>
          Via barrel üzerinden katmanlar arası ısı iletimini tahmin eder: tek via ve dizi termal
          direnci, via sayısına göre göreceli iyileşme ve iletilen ısı.
        </p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>Girdiler</h2>

          <ThermalViaSchematic r={r} />

          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: MODE_ANALYSIS, label: 'Analiz — direnci bul' },
              { value: MODE_SYNTHESIS, label: 'Sentez — via sayısı bul' },
            ]}
          />

          <NumberField
            label="Bitmiş delik çapı (D_f)"
            value={f.Df} onChange={set('Df')}
            units={DIA_UNITS} unit={f.Dfu} onUnit={set('Dfu')}
            hint="Termal viada tipik 0.2–0.4 mm"
          />
          <NumberField
            label="Kaplama kalınlığı (t_p)"
            value={f.tp} onChange={set('tp')}
            units={DIA_UNITS} unit={f.tpu} onUnit={set('tpu')}
          />
          <NumberField
            label="Via uzunluğu (H)"
            value={f.H} onChange={set('H')}
            units={DIA_UNITS} unit={f.Hu} onUnit={set('Hu')}
          />

          {mode === MODE_ANALYSIS ? (
            <NumberField
              label="Via sayısı"
              value={f.N} onChange={set('N')}
              units={['adet']} unit="adet" onUnit={() => {}}
            />
          ) : (
            <NumberField
              label="İletilecek ısı"
              value={f.Q} onChange={set('Q')}
              units={['W', 'mW']} unit={f.Qu} onUnit={set('Qu')}
            />
          )}

          <NumberField
            label="Sıcaklık farkı (ΔT)"
            value={f.deltaT} onChange={set('deltaT')}
            units={['°C']} unit="°C" onUnit={() => {}}
            hint="Vianın iki ucu arasındaki fark"
          />

          <label className="check-row">
            <input type="checkbox" checked={f.filled} onChange={(e) => set('filled')(e.target.checked)} />
            Bakır dolgulu via
          </label>

          <NumberField
            label="Bakır termal iletkenliği"
            value={f.k} onChange={set('k')}
            units={['W/(m·K)']} unit="W/(m·K)" onUnit={() => {}}
            hint="Tipik aralık 385–400"
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
                  {r.mode === MODE_SYNTHESIS ? 'Gereken via sayısı' : 'Dizi termal direnci'}
                </div>
                <div className="value">
                  {r.mode === MODE_SYNTHESIS ? r.N : `${fmt(r.Rarray, 4)} °C/W`}
                </div>
                <div className="alt">
                  {r.mode === MODE_SYNTHESIS
                    ? <>dizi direnci {fmt(r.Rarray, 4)} °C/W &nbsp;·&nbsp; taşınan {fmtPow(r.actualQ, 3)}</>
                    : <>tek via {fmt(r.Rsingle, 4)} °C/W &nbsp;·&nbsp; taşınan {fmtPow(r.actualQ, 3)}</>}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr>
                    <td>Barrel kesit alanı</td>
                    <td>{fmt(r.area * 1e6, 4)} mm²</td>
                  </tr>
                  {r.filled && (
                    <tr>
                      <td>Bakır dolgu alanı</td>
                      <td>{fmt(r.fillArea * 1e6, 4)} mm²</td>
                    </tr>
                  )}
                  <tr>
                    <td>Tek via termal direnci</td>
                    <td>{fmt(r.Rsingle, 5)} °C/W</td>
                  </tr>
                  <tr>
                    <td>Dizi termal direnci ({r.N} via)</td>
                    <td>{fmt(r.Rarray, 5)} °C/W</td>
                  </tr>
                  <tr>
                    <td>Tek viaya göre iyileşme</td>
                    <td>{fmt(r.improvementVsOne, 4)}×</td>
                  </tr>
                  <tr>
                    <td>Sıcaklık farkı</td>
                    <td>{fmt(r.deltaT, 4)} °C</td>
                  </tr>
                  <tr>
                    <td>Tahmini iletilen ısı</td>
                    <td>{fmtPow(r.actualQ, 5)}</td>
                  </tr>
                  {r.mode === MODE_SYNTHESIS && (
                    <tr>
                      <td>Hedef için gereken direnç</td>
                      <td>{fmt(r.Rneeded, 5)} °C/W</td>
                    </tr>
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

          <pre className="formula">{`A_barrel = π·t_p·(D_f + t_p)
Bakır dolgulu:
    A = A_barrel + π·D_f²/4

Tek via: R_θ = H / (k·A)
N via: R_θ,dizi = R_θ / N

İletilen ısı: Q = ΔT / R_θ

Gerçek toplam yol:
  R_θ,toplam = R_θ,üst yayılım
             + R_θ,vialar
             + R_θ,alt yayılım
             + R_θ,ortam`}</pre>

          {r.ok && (
            <ul className="detail-list">
              <li>Kullanılan termal iletkenlik {fmt(r.k, 4)} W/(m·K).</li>
              <li>İletken kesit {fmtEng(r.area, 'm²', 5)}; via uzunluğu {fmtEng(r.H, 'm', 4)}.</li>
              <li>Dizi direnci tek via direncinin via sayısına bölümüdür — vialar aynı kabul edilir.</li>
              <li>Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.</li>
            </ul>
          )}

          <h2 className="section">Geçerlilik ve varsayımlar</h2>
          <ul className="detail-list">
            <li>
              Sonuç yalnızca via barrel direncidir. Sistemin toplam termal direnci buna üst ve alt
              bakır yayılımı ile ortam direncini de ekler; junction sıcaklığı bu hesapla
              belirlenemez.
            </li>
            <li>
              Tüm vialar aynı geometride ve eşit yüklü kabul edilir. Gerçekte kenar vialar merkez
              vialardan daha çok ısı taşır.
            </li>
            <li>Bakır düzgün kalınlıkta kaplanmış varsayılır; delik ortasında incelme modelde yoktur.</li>
            <li>Dielektrik üzerinden paralel iletim yolu ihmal edilir — FR-4 bakırın binde biri kadar iletir.</li>
            <li>Konveksiyon, radyasyon ve komşu bileşenlerin ısısı modelde yoktur.</li>
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
                { label: 'dizi termal direnci', tone: toneClass(0), kind: 'line' },
                ...s.refs.map(() => ({ label: 'hedef için gereken', tone: 'tone-muted', kind: 'line' })),
              ]}
            />

            <LineChart
              xScale="linear"
              xLabel={CHART.x}
              yLabel={CHART.y}
              series={chartSeries}
              refLines={s.refs.map((ref) => ({
                key: ref.key, y: ref.y, label: `gereken ${fmt(ref.y, 3)} °C/W`,
              }))}
              marker={{ ...s.marker, label: `${r.N} via` }}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => fmt(v, 3)}
              caption={CHART.caption}
            />

            <ChartDataTable
              xLabel={CHART.x}
              series={chartSeries}
              every={3}
              formatX={(v) => `${fmt(v, 2)} via`}
              formatY={(v) => `${fmt(v, 4)} °C/W`}
            />
          </>
        ) : (
          <p className="empty-note">Grafik için geçerli girdi gerekli.</p>
        )}
      </section>

    </>
  )
}
