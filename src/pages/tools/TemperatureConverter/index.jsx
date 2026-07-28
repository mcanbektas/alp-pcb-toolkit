import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import Segmented from '../../../components/Segmented'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import useToolForm from '../../../hooks/useToolForm'
import { fmt, THOUSANDS_MESSAGE } from '../../../lib/num'
import TemperatureSchematic from './schematic'
import {
  INITIAL_FORM, MODES, MODE_DELTA, UNITS, SWEEP_PARAMS, SWEEP_F, SWEEP_K,
  compute, buildSweep,
} from './model'
import {
  MODE_LABEL, SCALE_LABEL, DELTA_SCALE_LABEL, REF_POINT_LABEL,
  SWEEP_LABEL, REF_LABEL, CHART, SOURCE_NOTES, DELTA_RULE_NOTES,
  reasonText, commentary,
} from './text'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }

// Sıcaklık dört anlamlı basamakta okunaksız kalır (298.2 K gibi)
const SIG = 6

export default function TemperatureConverter() {
  const { f, set } = useToolForm(INITIAL_FORM)
  const [sweep, setSweep] = useState(SWEEP_F)

  const r = useMemo(() => compute(f), [f])
  const s = useMemo(() => buildSweep(r, sweep), [r, sweep])
  const notes = useMemo(() => commentary(r), [r])

  const status = useMemo(() => {
    if (!r.ok || notes.length === 0) return null
    const worst = notes.reduce((acc, n) => (LEVEL_RANK[n.level] > LEVEL_RANK[acc] ? n.level : acc), 'ok')
    const count = notes.filter((n) => n.level === worst).length
    if (worst === 'ok') return { cls: 'ok', text: 'Tüm kontroller geçti' }
    if (worst === 'warn') return { cls: 'warn', text: `Sınıra yakın — ${count} uyarı` }
    return { cls: 'danger', text: `${count} kontrol sınırın dışında` }
  }, [r, notes])

  const isDelta = f.mode === MODE_DELTA

  // Başlıkta girişin kendi ölçeği tekrar edilmez; diğer iki ölçek öne çıkar.
  const others = r.ok ? r.scales.filter((x) => x.unit !== r.unit) : []

  const seriesName = s
    ? (s.mode === MODE_DELTA
      ? (s.param === SWEEP_K ? 'ΔT_K' : 'ΔT_F')
      : (s.param === SWEEP_K ? 'T_K' : 'T_F'))
    : ''
  const chartSeries = s
    ? [{ key: 'scale', name: seriesName, tone: toneClass(0), points: s.points }]
    : []

  return (
    <>
      {/* 1) BAŞLIK */}
      <Link className="backlink" to="/kategori/uretim-dfm">← PCB Üretim, DFM ve Dönüşümler</Link>

      <div className="tool-header">
        <h1>Temperature Converter</h1>
        <p>
          Santigrat, Fahrenheit ve kelvin arasında çift yönlü çevirir; mutlak sıcaklığı
          mutlak sıfır sınırıyla birlikte, sıcaklık farkını (ΔT) ise ayrı bir modda ofsetsiz
          olarak verir — ikisi aynı denklemle çevrilmediği için karıştırılmaz.
        </p>
      </div>

      {/* 2) ÜÇ PANEL */}
      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>Girdiler</h2>

          <TemperatureSchematic r={r} />

          <Segmented
            value={f.mode}
            onChange={set('mode')}
            options={MODES.map((m) => ({ value: m, label: MODE_LABEL[m] }))}
          />

          <NumberField
            label={isDelta ? 'Sıcaklık farkı (ΔT)' : 'Sıcaklık'}
            value={f.T} onChange={set('T')}
            units={UNITS} unit={f.Tu} onUnit={set('Tu')}
            hint={isDelta
              ? 'İki sıcaklık arasındaki fark. Negatif değer soğumadır; ofset uygulanmaz'
              : 'Ölçek üzerindeki tek bir nokta. Alt sınır mutlak sıfırdır'}
          />

          {isDelta && (
            <NumberField
              label="Ortam sıcaklığı"
              value={f.amb} onChange={set('amb')}
              units={UNITS} unit={f.ambu} onUnit={set('ambu')}
              hint="İsteğe bağlı — girilirse artışın üstüne bindiği mutlak sıcaklık da hesaplanır. Boş bırakılırsa yalnızca fark çevrilir"
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
                <div className="label">
                  {r.mode === MODE_DELTA ? 'Farkın diğer ölçeklerdeki karşılığı' : 'Diğer ölçeklerdeki karşılığı'}
                </div>
                <div className="value">{fmt(others[0].value, SIG)} {others[0].unit}</div>
                <div className="alt">
                  {fmt(others[1].value, SIG)} {others[1].unit}
                  &nbsp;·&nbsp; giriş {fmt(r.input, SIG)} {r.unit}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr className="mini-head">
                    <td>{r.mode === MODE_DELTA ? 'Sıcaklık farkı' : 'Mutlak sıcaklık'}</td>
                    <td>üç ölçekte</td>
                  </tr>
                  {r.scales.map((x) => (
                    <tr key={x.unit}>
                      <td>{r.mode === MODE_DELTA ? DELTA_SCALE_LABEL[x.unit] : SCALE_LABEL[x.unit]}</td>
                      <td>{fmt(x.value, SIG)} {x.unit}</td>
                    </tr>
                  ))}
                  {r.mode !== MODE_DELTA && (
                    <tr>
                      <td>Mutlak sıfıra kalan pay</td>
                      <td>
                        {fmt(r.temp.marginK, SIG)} K{' '}
                        <span className="sub">(T_K değerinin kendisi)</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {r.mode === MODE_DELTA && r.final && (
                <>
                  <h2 className="section">Ortam üstüne yükselme</h2>
                  <table className="result-table">
                    <tbody>
                      <tr className="mini-head">
                        <td>Nokta</td>
                        <td>°C · °F · K</td>
                      </tr>
                      <tr>
                        <td>Ortam sıcaklığı (mutlak)</td>
                        <td>
                          {fmt(r.final.ambient.C, SIG)} · {fmt(r.final.ambient.F, SIG)} · {fmt(r.final.ambient.K, SIG)}
                        </td>
                      </tr>
                      <tr>
                        <td>Sıcaklık artışı (fark)</td>
                        <td>
                          {fmt(r.delta.dC, SIG)} · {fmt(r.delta.dF, SIG)} · {fmt(r.delta.dK, SIG)}{' '}
                          <span className="sub">(ofsetsiz)</span>
                        </td>
                      </tr>
                      <tr>
                        <td>Ulaşılan sıcaklık (mutlak)</td>
                        <td>
                          {fmt(r.final.C, SIG)} · {fmt(r.final.F, SIG)} · {fmt(r.final.K, SIG)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}

              {r.mode !== MODE_DELTA && (
                <>
                  <h2 className="section">Sık kullanılan referanslar</h2>
                  <table className="result-table">
                    <tbody>
                      <tr className="mini-head">
                        <td>Nokta</td>
                        <td>°C · °F · K</td>
                      </tr>
                      {r.refs.map((p) => (
                        <tr key={p.key}>
                          <td>{REF_POINT_LABEL[p.key]}</td>
                          <td>{fmt(p.C, SIG)} · {fmt(p.F, SIG)} · {fmt(p.K, SIG)}</td>
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

          <pre className="formula">{`Mutlak sıcaklık:
  T_F = (9/5)·T_C + 32
  T_C = (5/9)·(T_F − 32)
  T_K = T_C + 273.15
  T_C = T_K − 273.15

Sıcaklık farkı (ΔT) — ofset yok:
  ΔT_K = ΔT_C
  ΔT_F = (9/5)·ΔT_C
  ΔT_C = (5/9)·ΔT_F

Ortam üstüne yükselme:
  T_son = T_ortam + ΔT

Fiziksel alt sınır:
  T_K ≥ 0
    →  T_C ≥ −273.15
    →  T_F ≥ −459.67`}</pre>

          {r.ok && (
            <ul className="detail-list">
              <li>
                Giriş {fmt(r.input, SIG)} {r.unit};{' '}
                {r.mode === MODE_DELTA
                  ? `fark santigrat karşılığı ${fmt(r.delta.dC, SIG)} °C olarak taşındı.`
                  : `santigrat karşılığı ${fmt(r.temp.C, SIG)} °C üzerinden diğer ölçekler türetildi.`}
              </li>
              <li>
                Girişin kendi ölçeğindeki değeri gidiş-dönüş yapılmadan korunur; yalnızca diğer
                iki ölçek türetilir, böylece yazılan sayı çevrim artığıyla değişmiş görünmez.
              </li>
              {r.mode === MODE_DELTA ? (
                <li>
                  Fark büyüklüğünde yalnızca 9/5 eğimi uygulanır; 32 ve 273.15 ofsetleri
                  kullanılmaz. Bu yüzden ΔT_C ile ΔT_K sayıca özdeştir.
                </li>
              ) : (
                <li>
                  Mutlak sıfır kontrolü kelvin üzerinden yapılır (T_K ≥ 0). Sınırın tam
                  üstündeki girişler ikilik tabandaki temsil hatası nedeniyle reddedilmesin
                  diye 1e-9 K'lik sayısal pay bırakılır.
                </li>
              )}
              <li>Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.</li>
            </ul>
          )}

          <h2 className="section">Kaynak ve tanımlar</h2>
          <ul className="detail-list">
            {SOURCE_NOTES.map((t) => <li key={t}>{t}</li>)}
          </ul>

          <h2 className="section">Geçerlilik ve varsayımlar</h2>
          <ul className="detail-list">
            <li>
              Mutlak sıfır fiziksel alt sınırdır: T_K = 0, yani −273.15 °C ve −459.67 °F. Bu
              sınırın altındaki bir giriş hesaplanmaz; sonuç yerine hata gösterilir.
            </li>
            {DELTA_RULE_NOTES.map((t) => <li key={t}>{t}</li>)}
            <li>
              Ölçek dönüşümleri tanım gereği tamdır; yaklaşıklık formülde değil, girilen
              değerin ve ölçüm cihazının doğruluğundadır.
            </li>
            <li>
              Ortam artı artış satırı yalnızca doğrusal bir toplamdır. Gerçek yükselmenin ne
              kadar olacağı akıma, bakır kesitine ve ısı yoluna bağlıdır; bu ekran onu
              hesaplamaz.
            </li>
            <li>
              Rankine (°R) ve Réaumur gibi diğer ölçekler kapsam dışıdır; yalnızca °C, °F ve K
              desteklenir.
            </li>
            <li>
              Sapma yalnızca gösterim yuvarlamasından gelir; hesap tam değerle yapılır,
              yuvarlama son adımda uygulanır.
            </li>
          </ul>
        </section>
      </div>

      {/* 3) ALT: Parametrik grafik */}
      <section className="panel panel-chart">
        <div className="chart-head">
          <h2>Parametrik grafik</h2>
          <Segmented
            value={sweep}
            onChange={setSweep}
            options={SWEEP_PARAMS.map((p) => ({ value: p, label: SWEEP_LABEL[p] }))}
          />
        </div>

        {s ? (
          <>
            <ChartLegend
              items={[
                { label: seriesName, tone: toneClass(0), kind: 'line' },
                ...s.refs.map((ref) => ({
                  label: REF_LABEL[ref.key](ref.y, ref.unit), tone: 'tone-muted', kind: 'line',
                })),
              ]}
            />

            <LineChart
              xScale="linear"
              xLabel={CHART.x(s.mode)}
              yLabel={CHART.y(s.mode, s.param)}
              series={chartSeries}
              refLines={s.refs.map((ref) => ({
                key: ref.key, y: ref.y, label: REF_LABEL[ref.key](ref.y, ref.unit),
              }))}
              marker={s.marker ? { ...s.marker, label: 'seçilen' } : null}
              formatX={(v) => fmt(v, 5)}
              formatY={(v) => fmt(v, 5)}
              caption={CHART.caption(s.mode, s.param)}
            />

            <ChartDataTable
              xLabel={CHART.x(s.mode)}
              series={chartSeries}
              every={5}
              formatX={(v) => `${fmt(v, 5)} °C`}
              formatY={(v) => `${fmt(v, 5)} ${s.param === SWEEP_K ? 'K' : '°F'}`}
            />
          </>
        ) : (
          <p className="empty-note">Grafik için geçerli girdi gerekli.</p>
        )}
      </section>

      {/* 4) GERİ BAĞLANTI */}
    </>
  )
}
