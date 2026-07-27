import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import Segmented from '../../../components/Segmented'
import RowList from '../../../components/RowList'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import useToolForm from '../../../hooks/useToolForm'
import { fmt, fmtEng, fmtRes, fmtVolt, THOUSANDS_MESSAGE } from '../../../lib/num'
import { VOLTAGE, fromSI } from '../../../lib/units'
import DecouplingSchematic from './schematic'
import {
  INITIAL_FORM, MODE_MIN, MODE_NETWORK, CAP_COLUMNS, compute, buildSweep,
} from './model'
import {
  MODE_LABEL, NOTE_MIN, NOTE_NETWORK, CHART_MIN, CHART_MIN_X_UNIT, CHART_NET,
  netCaption, reasonText, commentary,
} from './text'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }

const FORMULA = {
  [MODE_MIN]: `Çekilen yük (spec §8.2):
  ΔQ = ΔI·Δt
  ΔQ = C·ΔV

Minimum ideal kapasite:
  C_min = ΔI·Δt / ΔV

Bu ifade ESR ve ESL etkisini
İÇERMEZ. Gerçek kapasitörde ESR
anlık gerilim düşümü, ESL ise
akım değişimine direnç üretir;
ikisi de ripple'ı büyütür.`,

  [MODE_NETWORK]: `Gerçek kapasitör, seri RLC
(spec §8.2.1):
  Z_C = ESR + j(ω·ESL − 1/(ω·C))
  |Z_C| =
    √(ESR² + (ω·ESL − 1/(ω·C))²)

Kendi rezonans frekansı:
  SRF = 1 / (2π·√(ESL·C))
  SRF'de reaktanslar götürür
    → |Z_C| ≈ ESR
  SRF üstünde kapasitör
  endüktiftir

Paralel ağ (spec §8.2.2):
  Z_ağ(ω) = [ Σ 1/Z_i(ω) ]⁻¹
  toplam KOMPLEKS admitans
  üzerinden alınır; anti-rezonans
  tepeleri böyle görünür

N adet aynı kapasitör:
  C_eq = N·C
  ESR_eq = ESR/N
  ESL_eq = ESL/N
  ortak via/dar bağlantı varsa
  ESL 1/N azalmaz`,
}

export default function Decoupling() {
  const [mode, setMode] = useState(MODE_MIN)
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

  const isMin = mode === MODE_MIN
  const chartMeta = isMin ? CHART_MIN : CHART_NET

  const chartSeries = !s
    ? []
    : s.kind === MODE_MIN
      ? [{ key: 'cmin', name: 'C_min', tone: toneClass(0), points: s.points }]
      : [
          { key: 'net', name: 'ağ |Z|', tone: toneClass(0), points: s.points },
          ...s.series.map((x) => ({
            key: `row${x.index}`,
            name: `satır ${x.index + 1}`,
            tone: toneClass(x.index + 1),
            points: x.points,
          })),
        ]

  // Minimum kapasite modunda x ekseni SI (V) gelir; gösterim birimine çevrim
  // burada, units.js tablosundan yapılır. Birim adı eksen etiketiyle aynı
  // sabitten (CHART_MIN_X_UNIT) gelir.
  const toChartX = (v) => fromSI(v, CHART_MIN_X_UNIT, VOLTAGE)

  const formatY = isMin
    ? (v) => fmtEng(v, 'F', 3)
    : (v) => fmtRes(Math.pow(10, v), 3)
  const formatX = isMin
    ? (v) => fmt(toChartX(v), 3)
    : (v) => fmtEng(v, 'Hz', 3)

  return (
    <>
      <div className="tool-header">
        <h1>Decoupling Network</h1>
        <p>
          Ani akım talebi için gereken minimum ideal kapasiteyi; paralel kapasitör ağının
          seçilen frekanstaki empedansını, her kapasitörün kendi rezonans frekansını ve
          aradaki anti-rezonans tepelerini hesaplar.
        </p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>Girdiler</h2>

          <DecouplingSchematic r={r} mode={mode} />

          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: MODE_MIN, label: MODE_LABEL[MODE_MIN] },
              { value: MODE_NETWORK, label: MODE_LABEL[MODE_NETWORK] },
            ]}
          />

          {isMin ? (
            <>
              <NumberField
                label="Ani akım değişimi (ΔI)"
                value={f.dI} onChange={set('dI')}
                units={['A', 'mA']} unit={f.dIu} onUnit={set('dIu')}
                hint="Yükün bir anda çektiği akım basamağı"
              />
              <NumberField
                label="Geçiş süresi (Δt)"
                value={f.dT} onChange={set('dT')}
                units={['ns', 'µs', 'ms', 's']} unit={f.dTu} onUnit={set('dTu')}
                hint="Akım basamağının süresi — yükün bu süre boyunca kapasitörden beslendiği kabul edilir"
              />
              <NumberField
                label="İzin verilen gerilim değişimi (ΔV)"
                value={f.dV} onChange={set('dV')}
                units={['mV', 'V']} unit={f.dVu} onUnit={set('dVu')}
                hint="Ray toleransının bu olaya ayrılan payı"
              />
            </>
          ) : (
            <>
              <RowList
                label="Kapasitör satırları"
                rows={f.caps}
                columns={CAP_COLUMNS}
                onChange={set('caps')}
                rowLabel="Kapasitör"
                addLabel="Kapasitör ekle"
                hint="ESR sıfır bırakılamaz: kayıpsız kapasitör rezonansta sıfır empedans verir ve sonuç anlamsızlaşır"
              />
              <NumberField
                label="Değerlendirme frekansı"
                value={f.fEval} onChange={set('fEval')}
                units={['kHz', 'MHz', 'GHz']} unit={f.fEvalu} onUnit={set('fEvalu')}
                hint="Empedansın okunacağı frekans; grafik 1 kHz – 1 GHz aralığını tarar"
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
          ) : isMin ? (
            <>
              <div className="big-result">
                <div className="label">Minimum ideal kapasite</div>
                <div className="value">{fmtEng(r.C, 'F', 4)}</div>
                <div className="alt">
                  ΔQ = {fmtEng(r.charge, 'C', 4)} &nbsp;·&nbsp; ΔV = {fmtVolt(r.deltaV)}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <p className="method-note">{NOTE_MIN}</p>

              <table className="result-table">
                <tbody>
                  <tr>
                    <td>Minimum ideal kapasite (C_min)</td>
                    <td>{fmtEng(r.C, 'F', 5)}</td>
                  </tr>
                  <tr>
                    <td>Çekilen yük (ΔQ = ΔI·Δt)</td>
                    <td>{fmtEng(r.charge, 'C', 5)}</td>
                  </tr>
                  <tr>
                    <td>Ani akım değişimi (ΔI)</td>
                    <td>{fmtEng(r.deltaI, 'A', 4)}</td>
                  </tr>
                  <tr>
                    <td>Geçiş süresi (Δt)</td>
                    <td>{fmtEng(r.deltaT, 's', 4)}</td>
                  </tr>
                  <tr>
                    <td>İzin verilen gerilim değişimi (ΔV)</td>
                    <td>{fmtVolt(r.deltaV)}</td>
                  </tr>
                  <tr>
                    <td>ESR ve ESL dahil mi</td>
                    <td>{r.includesEsrEsl ? 'evet' : 'hayır'}</td>
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
                <div className="label">Ağ empedansı @ {fmtEng(r.f, 'Hz', 4)}</div>
                <div className="value">{fmtRes(r.mag, 4)}</div>
                <div className="alt">
                  R = {fmtRes(r.re, 3)} &nbsp;·&nbsp; X = {fmtRes(r.im, 3)} (
                  {r.inductive ? 'endüktif' : 'kapasitif'})
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <p className="method-note">{NOTE_NETWORK}</p>

              <table className="result-table">
                <tbody>
                  {r.items.map((it, i) => (
                    <tr key={i}>
                      <td>
                        Satır {i + 1} — {fmtEng(it.C, 'F', 3)} × {fmt(it.count, 3)} adet ·
                        ESR {fmtRes(it.ESR, 3)} · ESL {fmtEng(it.ESL, 'H', 3)}
                      </td>
                      <td>
                        {fmtRes(it.group ? it.group.mag : NaN, 3)}
                        <span className="sub">
                          {' '}· SRF {it.srf != null ? fmtEng(it.srf, 'Hz', 3) : '—'} ·{' '}
                          {it.single ? (it.single.aboveSrf ? 'endüktif' : 'kapasitif') : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="method-note">
                Satır empedansı, o satırdaki N kapasitörün birlikte empedansıdır. SRF tekil
                kapasitörle aynıdır, çünkü C_eq·ESL_eq çarpımı değişmez.
              </p>

              <h2 className="section">Aynı değerli N kapasitör eşdeğeri</h2>
              <table className="result-table">
                <tbody>
                  {r.items.map((it, i) => (
                    <tr key={i}>
                      <td>
                        Satır {i + 1} eşdeğeri — N = {fmt(it.count, 3)} · tekil kapasitör
                        empedansı {fmtRes(it.single ? it.single.mag : NaN, 3)}
                      </td>
                      <td>
                        {fmtEng(it.bank ? it.bank.Ceq : NaN, 'F', 3)}
                        <span className="sub">
                          {' '}· ESR {fmtRes(it.bank ? it.bank.ESReq : NaN, 3)} ·
                          ESL {fmtEng(it.bank ? it.bank.ESLeq : NaN, 'H', 3)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h2 className="section">Ağ toplamı</h2>
              <table className="result-table">
                <tbody>
                  <tr>
                    <td>Ağ empedansı |Z|</td>
                    <td>{fmtRes(r.mag, 5)}</td>
                  </tr>
                  <tr>
                    <td>Direnç bileşeni (R)</td>
                    <td>{fmtRes(r.re, 4)}</td>
                  </tr>
                  <tr>
                    <td>Reaktans (X)</td>
                    <td>
                      {fmtRes(r.im, 4)}{' '}
                      <span className="sub">({r.inductive ? 'endüktif' : 'kapasitif'})</span>
                    </td>
                  </tr>
                  <tr>
                    <td>Toplam kapasitör adedi</td>
                    <td>{fmt(r.count, 4)}</td>
                  </tr>
                  <tr>
                    <td>Kendi rezonansının üstünde olan satır</td>
                    <td>{fmt(r.aboveCount, 3)} / {fmt(r.items.length, 3)}</td>
                  </tr>
                  <tr>
                    <td>ESL'si sıfır girilen satır</td>
                    <td>
                      {fmt(r.noEslCount, 3)} / {fmt(r.items.length, 3)}
                      {r.noEslCount > 0 && (
                        <span className="sub"> · rezonans frekansı tanımsız</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td>Anti-rezonans tepesi</td>
                    <td>
                      {r.peak
                        ? <>{fmtEng(r.peak.f, 'Hz', 4)} · {fmtRes(r.peak.mag, 4)}</>
                        : 'taramada yok'}
                    </td>
                  </tr>
                  {r.peak && r.peakWorstSingle != null && (
                    <tr>
                      <td>Tepede en yüksek tekil satır |Z|</td>
                      <td>
                        {fmtRes(r.peakWorstSingle, 4)}{' '}
                        <span className="sub">
                          ({r.peakAbove ? 'tepe daha yüksek' : 'tepe daha alçak'})
                        </span>
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td>ESL için 1/N ideal paylaşım varsayımı</td>
                    <td>{r.idealSharing ? 'evet' : 'hayır'}</td>
                  </tr>
                  <tr>
                    <td>Montaj, via ve yayılma endüktansı dahil mi</td>
                    <td>hayır</td>
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

          <pre className="formula">{FORMULA[mode]}</pre>

          {r.ok && (
            <ul className="detail-list">
              {isMin ? (
                <>
                  <li>
                    ΔQ = ΔI·Δt = {fmtEng(r.charge, 'C', 4)}; aynı yük C·ΔV olarak yazılınca
                    C_min = {fmtEng(r.C, 'F', 4)} çıkar.
                  </li>
                  <li>
                    Motorun bildirdiği alan: ESR/ESL dahil = {r.includesEsrEsl ? 'evet' : 'hayır'}.
                    Sonuç bu yüzden ideal kapasitörün alt sınırıdır.
                  </li>
                </>
              ) : (
                <>
                  <li>
                    Ağ toplamı kompleks admitans üzerinden alınır; büyüklükleri toplamak
                    anti-rezonans tepelerini yok ederdi.
                  </li>
                  <li>
                    Değerlendirme frekansı {fmtEng(r.f, 'Hz', 4)}; grafik taraması 1 kHz – 1 GHz,
                    dekat başına 40 nokta. Tepe konumu bu çözünürlükle sınırlıdır.
                  </li>
                  <li>
                    SRF tekil kapasitörle N adetli grup için aynıdır: C_eq = N·C ve ESL_eq = ESL/N
                    çarpımı değişmez, dolayısıyla rezonans frekansı kaymaz. Değişen şey empedans
                    seviyesidir.
                  </li>
                  <li>
                    Grafiğin y ekseni logaritmiktir; eksen etiketleri ve veri tablosu gerçek
                    empedans değerlerini gösterir.
                  </li>
                </>
              )}
              <li>Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.</li>
            </ul>
          )}

          <h2 className="section">Geçerlilik ve varsayımlar</h2>
          <ul className="detail-list">
            <li>
              Seri RLC modeli yalnızca <strong>kapasitörün kendisini</strong> modeller. Bağlantı
              endüktansı — montaj pedi, via ve düzlem yayılma endüktansı — bu sonuca DAHİL
              DEĞİLDİR ve ayrıca eklenmelidir (spec §8.2.4); o hesap PDN ekranındadır. Yüksek
              frekansta baskın terim genellikle kapasitörün kendi ESL'si değil, bu bağlantıdır.
            </li>
            <li>
              Üretici S-parametresi veya ölçülmüş empedans eğrisi bu üç terimli modelden daha
              doğrudur. ESR ve ESL burada sabit alınır; gerçekte ikisi de frekansa ve sıcaklığa
              göre değişir.
            </li>
            <li>
              Nominal kapasite kullanılır. Seramik kapasitörde uygulanan DC gerilim ve sıcaklık
              gerçek kapasiteyi nominalin altına indirir; bu düşüş modelde yoktur.
            </li>
            <li>
              Her kapasitör için ESR &gt; 0 zorunludur: kayıpsız kapasitör kendi rezonansında
              sıfır empedans, anti-rezonansta ise sonsuz tepe verir ve sonuç fizik değil yuvarlama
              gürültüsü olur.
            </li>
            <li>
              ESR/N ve ESL/N ölçeklemesi bağımsız ve eşit bağlantı yolları varsayar. Ortak via
              veya ortak dar bağlantı varsa ESL tam olarak 1/N azalmaz (spec §8.2.2).
            </li>
            <li>
              Düzlem kapasitansı ve VRM empedansı bu ekranda yoktur; toplam PDN eğrisi ve hedef
              empedans karşılaştırması için PDN ekranı gerekir.
            </li>
            <li>
              Decoupling değeri işlemci clock frekansından tek başına seçilmez: ani akım, izin
              verilen ripple, ESR, ESL ve bağlantı endüktansı birlikte değerlendirilir.
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
                ...chartSeries.map((x) => ({ label: x.name, tone: x.tone, kind: 'line' })),
                ...s.refs.map(() => ({
                  label: isMin ? 'hesaplanan C_min' : 'anti-rezonans tepesi',
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
                label: isMin
                  ? `C_min ${fmtEng(r.C, 'F', 3)}`
                  : `tepe ${fmtRes(r.peak ? r.peak.mag : NaN, 3)}`,
              }))}
              marker={{
                ...s.marker,
                label: isMin ? 'çalışma noktası' : 'değerlendirme frekansı',
              }}
              formatX={formatX}
              formatY={formatY}
              caption={isMin
                ? CHART_MIN.caption
                : netCaption(s.hidden, r.peak, r.peakAbove, r.peakWorstSingle)}
            />

            <ChartDataTable
              xLabel={chartMeta.x}
              series={chartSeries}
              every={isMin ? 6 : 20}
              formatX={isMin
                ? (v) => `${fmt(toChartX(v), 4)} ${CHART_MIN_X_UNIT}`
                : (v) => fmtEng(v, 'Hz', 4)}
              formatY={isMin ? (v) => fmtEng(v, 'F', 4) : (v) => fmtRes(Math.pow(10, v), 4)}
            />
          </>
        ) : (
          <p className="empty-note">Grafik için geçerli girdi gerekli.</p>
        )}
      </section>

      <Link className="backlink" to="/kategori/guc-termal">← Güç Bütünlüğü ve Termal</Link>
    </>
  )
}
