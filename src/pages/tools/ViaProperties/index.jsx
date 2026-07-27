import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import Segmented from '../../../components/Segmented'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import useToolForm from '../../../hooks/useToolForm'
import {
  fmt, fmtEng, fmtOhm, fmtAmp, fmtVolt, fmtPow, fmtRes, THOUSANDS_MESSAGE,
} from '../../../lib/num'
import ViaSchematic from './schematic'
import {
  INITIAL_FORM, MODE_ANALYSIS, MODE_SYNTHESIS, BASIS_DRILL, BASIS_FINISHED,
  compute, buildSweep,
} from './model'
import { BASIS_LABEL, CHART, reasonText, commentary } from './text'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }

const DIA_UNITS = ['mm', 'um', 'mil']

export default function ViaProperties() {
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

  const chartSeries = s ? [{ key: 'vdrop', name: 'düşüm', tone: toneClass(0), points: s.points }] : []

  return (
    <>
      <div className="tool-header">
        <h1>Via Properties &amp; Current Capacity</h1>
        <p>
          Via barrel kesitini, direncini, gerilim düşümünü ve güç kaybını; gerekli paralel via
          sayısını, annular ring ile aspect ratio değerlerini ve yaklaşık parazitikleri hesaplar.
        </p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>Girdiler</h2>

          <ViaSchematic r={r} />

          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: MODE_ANALYSIS, label: 'Analiz — tek via' },
              { value: MODE_SYNTHESIS, label: 'Sentez — via sayısı bul' },
            ]}
          />

          <NumberField
            label="Bitmiş delik çapı (D_f)"
            value={f.Df} onChange={set('Df')}
            units={DIA_UNITS} unit={f.Dfu} onUnit={set('Dfu')}
          />
          <NumberField
            label="Kaplama kalınlığı (t_p)"
            value={f.tp} onChange={set('tp')}
            units={DIA_UNITS} unit={f.tpu} onUnit={set('tpu')}
            hint="Tipik 20–30 µm"
          />
          <NumberField
            label="Via uzunluğu / kart kalınlığı (H)"
            value={f.H} onChange={set('H')}
            units={DIA_UNITS} unit={f.Hu} onUnit={set('Hu')}
          />
          <NumberField
            label="Toplam akım (I)"
            value={f.I} onChange={set('I')}
            units={['A', 'mA']} unit={f.Iu} onUnit={set('Iu')}
          />
          <NumberField
            label="Çalışma sıcaklığı"
            value={f.T} onChange={set('T')}
            units={['°C']} unit="°C" onUnit={() => {}}
          />

          {mode === MODE_SYNTHESIS && (
            <>
              <NumberField
                label="İzin verilen gerilim düşümü"
                value={f.VdropMax} onChange={set('VdropMax')}
                units={['mV', 'V']} unit={f.VdropMaxu} onUnit={set('VdropMaxu')}
              />
              <NumberField
                label="Tek via akım sınırı"
                value={f.IsingleMax} onChange={set('IsingleMax')}
                units={['A', 'mA']} unit={f.IsingleMaxu} onUnit={set('IsingleMaxu')}
                hint="Üretici profilinden veya kendi kuralınızdan"
              />
              <NumberField
                label="En az via sayısı"
                value={f.Nmin} onChange={set('Nmin')}
                units={['adet']} unit="adet" onUnit={() => {}}
              />
            </>
          )}

          <h2 className="section">Padstack</h2>
          <NumberField
            label="Pad çapı"
            value={f.Dpad} onChange={set('Dpad')}
            units={DIA_UNITS} unit={f.Dpadu} onUnit={set('Dpadu')}
          />
          <NumberField
            label="Matkap çapı"
            value={f.Ddrill} onChange={set('Ddrill')}
            units={DIA_UNITS} unit={f.Ddrillu} onUnit={set('Ddrillu')}
            hint="Bitmiş çaptan büyüktür — kaplama deliği daraltır"
          />
          <NumberField
            label="Delik konum toleransı"
            value={f.posTol} onChange={set('posTol')}
            units={DIA_UNITS} unit={f.posTolu} onUnit={set('posTolu')}
          />
          <NumberField
            label="Pad aşındırma toleransı"
            value={f.etchTol} onChange={set('etchTol')}
            units={DIA_UNITS} unit={f.etchTolu} onUnit={set('etchTolu')}
          />
          <SelectField
            label="Aspect ratio tanımı"
            value={f.basis} onChange={set('basis')}
            options={[
              { value: BASIS_DRILL, label: 'Matkap çapı üzerinden' },
              { value: BASIS_FINISHED, label: 'Bitmiş delik çapı üzerinden' },
            ]}
          />

          <h2 className="section">Parazitikler</h2>
          <NumberField
            label="Antipad çapı"
            value={f.Dantipad} onChange={set('Dantipad')}
            units={DIA_UNITS} unit={f.Dantipadu} onUnit={set('Dantipadu')}
          />
          <NumberField
            label="Dielektrik sabiti (εr)"
            value={f.epsR} onChange={set('epsR')}
            units={['']} unit="" onUnit={() => {}}
            hint="FR-4 için tipik 4.2–4.5"
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
                  {r.mode === MODE_SYNTHESIS ? 'Gereken paralel via sayısı' : 'Tek via direnci'}
                </div>
                <div className="value">
                  {r.mode === MODE_SYNTHESIS ? r.N : fmtOhm(r.R)}
                </div>
                <div className="alt">
                  {r.mode === MODE_SYNTHESIS
                    ? <>düşüm {fmtVolt(r.VdropParallel)} &nbsp;·&nbsp; via başına {fmtAmp(r.IperVia, 3)}</>
                    : <>düşüm {fmtVolt(r.Vdrop)} &nbsp;·&nbsp; kayıp {fmtPow(r.Ploss, 3)}</>}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr>
                    <td>Barrel dış çapı</td>
                    <td>{fmtEng(r.Do, 'm', 4)}</td>
                  </tr>
                  <tr>
                    <td>Barrel kesit alanı</td>
                    <td>
                      {fmt(r.area * 1e6, 4)} mm²{' '}
                      <span className="sub">(ince yaklaşım {fmt(r.thinApprox * 1e6, 4)})</span>
                    </td>
                  </tr>
                  <tr>
                    <td>Direnç @ {fmt(r.T, 3)} °C</td>
                    <td>{fmtOhm(r.R)}</td>
                  </tr>
                  <tr>
                    <td>Gerilim düşümü (tek via)</td>
                    <td>{fmtVolt(r.Vdrop)}</td>
                  </tr>
                  <tr>
                    <td>Güç kaybı (tek via)</td>
                    <td>{fmtPow(r.Ploss, 4)}</td>
                  </tr>
                  <tr>
                    <td>Akım yoğunluğu (tek via)</td>
                    <td>{fmt(r.J / 1e6, 4)} A/mm²</td>
                  </tr>
                </tbody>
              </table>

              {r.mode === MODE_SYNTHESIS && (
                <>
                  <h2 className="section">Paralel via</h2>
                  <table className="result-table">
                    <tbody>
                      <tr>
                        <td>Akım kısıtından</td>
                        <td>{r.Ncurrent} adet</td>
                      </tr>
                      <tr>
                        <td>Gerilim düşümü kısıtından</td>
                        <td>{r.Nvoltage} adet</td>
                      </tr>
                      <tr>
                        <td>Kullanıcı alt sınırı</td>
                        <td>{r.limits.Nmin} adet</td>
                      </tr>
                      <tr>
                        <td>Belirleyici sonuç</td>
                        <td>{r.N} adet</td>
                      </tr>
                      <tr>
                        <td>Paralel direnç</td>
                        <td>{fmtOhm(r.Rparallel)}</td>
                      </tr>
                      <tr>
                        <td>Toplam düşüm / kayıp</td>
                        <td>{fmtVolt(r.VdropParallel)} · {fmtPow(r.PlossParallel, 3)}</td>
                      </tr>
                      <tr>
                        <td>Via başına akım / yoğunluk</td>
                        <td>{fmtAmp(r.IperVia, 3)} · {fmt(r.JperVia / 1e6, 3)} A/mm²</td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}

              <h2 className="section">Padstack</h2>
              <table className="result-table">
                <tbody>
                  <tr>
                    <td>Nominal annular ring</td>
                    <td>{fmtEng(r.ring.nominal, 'm', 4)}</td>
                  </tr>
                  <tr>
                    <td>Worst-case annular ring</td>
                    <td>
                      {fmtEng(r.ring.worst, 'm', 4)}
                      {r.ring.breakout && <span className="flag"> !</span>}
                    </td>
                  </tr>
                  <tr>
                    <td>Aspect ratio</td>
                    <td>
                      {fmt(r.aspect.ratio, 4)}{' '}
                      <span className="sub">({BASIS_LABEL[r.aspect.basis]})</span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <h2 className="section">Yaklaşık parazitikler</h2>
              <table className="result-table">
                <tbody>
                  <tr>
                    <td>Tek iletken self-endüktansı</td>
                    <td>{fmtEng(r.L, 'H', 4)}</td>
                  </tr>
                  <tr>
                    <td>Pad-antipad kapasitesi</td>
                    <td>{fmtEng(r.C, 'F', 4)}</td>
                  </tr>
                  {r.disc && (
                    <>
                      <tr>
                        <td>Süreksizlik empedansı</td>
                        <td>{fmtRes(r.disc.Z, 4)}</td>
                      </tr>
                      <tr>
                        <td>Süreksizlik gecikmesi</td>
                        <td>{fmtEng(r.disc.delay, 's', 4)}</td>
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

          <pre className="formula">{`D_o = D_f + 2·t_p
A = π/4·(D_o² − D_f²)
    = π·t_p·(D_f + t_p)
İnce yaklaşım:
    A ≈ π·D_f·t_p
    (π·t_p² kadar eksik)

R = ρ(T)·H / A
V = I·R   P = I²·R
J = I / A

Paralel via sayısı:
  N_I = ⌈I / I_tek⌉
  N_V = ⌈I·R / V_maks⌉
  N = max(N_I, N_V, N_kullanıcı)

Annular ring:
  A_R nominal =
      (D_pad − D_matkap) / 2
  A_R worst-case = nominal −
      T_konum − T_aşındırma

Aspect ratio: AR = H / D

L[nH] ≈ 0.2·H[mm]·[ln(4H/D) + 1]
C[pF] ≈ 0.0555·εr·H·D_pad /
    (D_antipad − D_pad)`}</pre>

          {r.ok && (
            <ul className="detail-list">
              <li>Kaplama / delik oranı {fmt(r.ratio, 4)}; ince yaklaşımın sapması %{fmt(r.thinErrorPct, 3)}.</li>
              <li>Kesit hesabında tam halka alanı kullanıldı.</li>
              <li>Aspect ratio {BASIS_LABEL[r.aspect.basis]} üzerinden hesaplandı.</li>
              <li>Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.</li>
            </ul>
          )}

          <h2 className="section">Geçerlilik ve varsayımlar</h2>
          <ul className="detail-list">
            <li>
              Barrel düzgün kalınlıkta kaplanmış kabul edilir. Gerçekte kaplama delik ortasında
              incelir; aspect ratio büyüdükçe fark artar.
            </li>
            <li>
              Via akım kapasitesi yalnızca DC dirençten belirlenemez; bağlı bakır, termal yapı ve
              komşu vialar sonucu değiştirir.
            </li>
            <li>
              Endüktans izole tek iletken içindir. Dönüş yolu, referans düzlemler, antipad ve via
              stub etkisi modelde yoktur; belirleyici olan loop endüktansıdır.
            </li>
            <li>
              Kapasite denklemi yalnızca basit dairesel pad-antipad yapısı içindir. Bölünmüş
              düzlem, blind/buried via, via-in-pad ve çok yüksek frekansta kullanılmamalıdır.
            </li>
            <li>
              Üretilebilirlik sınırı (maksimum aspect ratio) sabit değildir; üretici profilinden
              gelmelidir.
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
                { label: 'gerilim düşümü', tone: toneClass(0), kind: 'line' },
                ...s.refs.map(() => ({ label: 'izin verilen düşüm', tone: 'tone-muted', kind: 'line' })),
              ]}
            />

            <LineChart
              xScale="linear"
              xLabel={CHART.x}
              yLabel={CHART.y}
              series={chartSeries}
              refLines={s.refs.map((ref) => ({ key: ref.key, y: ref.y, label: `sınır ${fmtVolt(ref.y)}` }))}
              marker={{ ...s.marker, label: `${r.N} via` }}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => fmtEng(v, '', 3)}
              caption={CHART.caption}
            />

            <ChartDataTable
              xLabel={CHART.x}
              series={chartSeries}
              every={2}
              formatX={(v) => `${fmt(v, 2)} via`}
              formatY={(v) => fmtVolt(v)}
            />
          </>
        ) : (
          <p className="empty-note">Grafik için geçerli girdi gerekli.</p>
        )}
      </section>

      <Link className="backlink" to="/kategori/via-padstack">← Via ve Padstack</Link>
    </>
  )
}
