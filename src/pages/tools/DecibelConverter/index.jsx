import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import Segmented from '../../../components/Segmented'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import useToolForm from '../../../hooks/useToolForm'
import { fmt, fmtEng, fmtOhm, fmtVolt, THOUSANDS_MESSAGE } from '../../../lib/num'
import DecibelSchematic from './schematic'
import {
  INITIAL_FORM, MODES, DIRS,
  MODE_POWER, MODE_VOLTAGE, MODE_DBM,
  DIR_FORWARD,
  POWER_UNITS, VOLTAGE_UNITS,
  compute, buildSweep,
} from './model'
import {
  MODE_LABEL, DIR_LABEL, DIR_FIELD_LABEL, CHART,
  METHOD_NOTE, EQUAL_Z_NOTE, reasonText, commentary,
} from './text'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }

export default function DecibelConverter() {
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

  const forward = f.dir === DIR_FORWARD
  const chart = s ? CHART[s.kind] : null

  const chartSeries = !s
    ? []
    : s.kind === 'dbm'
      ? [{ key: 'dbm', name: chart.series, tone: toneClass(0), points: s.points }]
      : [
          { key: 'power', name: chart.power, tone: toneClass(0), points: s.points },
          { key: 'voltage', name: chart.voltage, tone: toneClass(1), points: s.voltagePoints },
        ]

  return (
    <>
      <div className="tool-header">
        <h1>Decibel, Gain & dBm Converter</h1>
        <p>
          Güç ve gerilim oranlarını dB'ye, dB değerini oranlara çevirir; ayrıca 1 mW referanslı
          dBm seviyesi ile mW/W arasında dönüşüm yapar ve seçilen referans empedansta RMS gerilim
          karşılığını gösterir. 10·log₁₀ ile 20·log₁₀ arasındaki farkı ve bu farkın hangi koşulda
          geçerli olduğunu birlikte değerlendirir.
        </p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>Girdiler</h2>

          <DecibelSchematic r={r} />

          <Segmented
            value={f.mode}
            onChange={set('mode')}
            options={MODES.map((m) => ({ value: m, label: MODE_LABEL[m] }))}
          />

          <SelectField
            label={DIR_FIELD_LABEL}
            value={f.dir}
            onChange={set('dir')}
            options={DIRS.map((d) => ({ value: d, label: DIR_LABEL[f.mode][d] }))}
          />

          {f.mode === MODE_POWER && forward && (
            <>
              <NumberField
                label="Giriş gücü (P₁)"
                value={f.P1} onChange={set('P1')}
                units={POWER_UNITS} unit={f.P1u} onUnit={set('P1u')}
              />
              <NumberField
                label="Çıkış gücü (P₂)"
                value={f.P2} onChange={set('P2')}
                units={POWER_UNITS} unit={f.P2u} onUnit={set('P2u')}
                hint="Oran P₂/P₁ olarak alınır; iki değer de sıfırdan büyük olmalı"
              />
            </>
          )}

          {f.mode === MODE_POWER && !forward && (
            <>
              <NumberField
                label="Kazanç (G)"
                value={f.dB} onChange={set('dB')}
                units={['dB']} unit="dB" onUnit={() => {}}
                hint="Negatif değer zayıflamadır"
              />
              <NumberField
                label="Giriş gücü (P₁)"
                value={f.P1} onChange={set('P1')}
                units={POWER_UNITS} unit={f.P1u} onUnit={set('P1u')}
                hint="İsteğe bağlı — girilirse çıkış gücü de hesaplanır"
              />
            </>
          )}

          {f.mode === MODE_VOLTAGE && forward && (
            <>
              <NumberField
                label="Giriş gerilimi (V₁)"
                value={f.V1} onChange={set('V1')}
                units={VOLTAGE_UNITS} unit={f.V1u} onUnit={set('V1u')}
              />
              <NumberField
                label="Çıkış gerilimi (V₂)"
                value={f.V2} onChange={set('V2')}
                units={VOLTAGE_UNITS} unit={f.V2u} onUnit={set('V2u')}
                hint="İki gerilim de aynı türden olmalı (ikisi de RMS ya da ikisi de tepe)"
              />
            </>
          )}

          {f.mode === MODE_VOLTAGE && !forward && (
            <>
              <NumberField
                label="Kazanç (G)"
                value={f.dB} onChange={set('dB')}
                units={['dB']} unit="dB" onUnit={() => {}}
                hint="Negatif değer zayıflamadır"
              />
              <NumberField
                label="Giriş gerilimi (V₁)"
                value={f.V1} onChange={set('V1')}
                units={VOLTAGE_UNITS} unit={f.V1u} onUnit={set('V1u')}
                hint="İsteğe bağlı — girilirse çıkış gerilimi de hesaplanır"
              />
            </>
          )}

          {f.mode === MODE_DBM && forward && (
            <NumberField
              label="Güç (P)"
              value={f.P} onChange={set('P')}
              units={POWER_UNITS} unit={f.Pu} onUnit={set('Pu')}
              hint="Sıfırdan büyük olmalı; 0 W için dBm tanımsızdır"
            />
          )}

          {f.mode === MODE_DBM && !forward && (
            <NumberField
              label="Güç seviyesi"
              value={f.dBm} onChange={set('dBm')}
              units={['dBm']} unit="dBm" onUnit={() => {}}
              hint="0 dBm = 1 mW; negatif değer 1 mW altını gösterir"
            />
          )}

          {f.mode === MODE_DBM && (
            <NumberField
              label="Referans empedans (Z₀)"
              value={f.Z} onChange={set('Z')}
              units={['Ω']} unit="Ω" onUnit={() => {}}
              hint="RMS gerilim karşılığı bu empedansta hesaplanır"
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
          ) : r.mode === MODE_DBM ? (
            <>
              <div className="big-result">
                <div className="label">Güç seviyesi</div>
                <div className="value">{fmt(r.dBm, 4)} dBm</div>
                <div className="alt">
                  {fmtEng(r.W, 'W', 4)} &nbsp;·&nbsp; {fmt(r.mW, 4)} mW
                  &nbsp;·&nbsp; {fmtVolt(r.Vrms)} RMS @ {fmtOhm(r.Z)}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr className="mini-head"><td>Seviye</td><td>1 mW referansına göre</td></tr>
                  <tr><td>dBm</td><td>{fmt(r.dBm, 5)} dBm</td></tr>
                  <tr>
                    <td>Güç</td>
                    <td>{fmt(r.mW, 5)} mW <span className="sub">({fmtEng(r.W, 'W', 5)})</span></td>
                  </tr>
                  <tr>
                    <td>Referansa oran</td>
                    <td>{fmt(r.powerRatio, 5)}× <span className="sub">(P / 1 mW)</span></td>
                  </tr>
                </tbody>
              </table>

              <h2 className="section">Referans empedansta gerilim</h2>
              <table className="result-table">
                <tbody>
                  <tr><td>Referans empedans</td><td>{fmtOhm(r.Z)}</td></tr>
                  <tr>
                    <td>RMS gerilim</td>
                    <td>{fmtVolt(r.Vrms)} <span className="sub">(V = √(P·Z₀))</span></td>
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
                <div className="label">Kazanç</div>
                <div className="value">{fmt(r.dB, 4)} dB</div>
                <div className="alt">
                  güç oranı ×{fmt(r.powerRatio, 4)} &nbsp;·&nbsp; gerilim oranı ×{fmt(r.voltageRatio, 4)}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr className="mini-head"><td>Oran</td><td>dB karşılığı</td></tr>
                  <tr>
                    <td>Güç oranı P₂/P₁</td>
                    <td>{fmt(r.powerRatio, 5)}× <span className="sub">(10·log₁₀)</span></td>
                  </tr>
                  <tr>
                    <td>Gerilim oranı V₂/V₁</td>
                    <td>{fmt(r.voltageRatio, 5)}× <span className="sub">(20·log₁₀, eşit empedans)</span></td>
                  </tr>
                  <tr><td>Kazanç</td><td>{fmt(r.dB, 5)} dB</td></tr>
                </tbody>
              </table>

              {(r.P1 != null || r.V1 != null) && (
                <>
                  <h2 className="section">Giriş ve çıkış</h2>
                  <table className="result-table">
                    <tbody>
                      {r.P1 != null && (
                        <tr><td>Giriş gücü P₁</td><td>{fmtEng(r.P1, 'W', 5)}</td></tr>
                      )}
                      {r.P2 != null && (
                        <tr><td>Çıkış gücü P₂</td><td>{fmtEng(r.P2, 'W', 5)}</td></tr>
                      )}
                      {r.V1 != null && (
                        <tr><td>Giriş gerilimi V₁</td><td>{fmtVolt(r.V1)}</td></tr>
                      )}
                      {r.V2 != null && (
                        <tr><td>Çıkış gerilimi V₂</td><td>{fmtVolt(r.V2)}</td></tr>
                      )}
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

          <pre className="formula">{`Güç oranı:
  G_dB = 10·log₁₀(P₂/P₁)

Gerilim oranı (eşit empedansta):
  G_dB = 20·log₁₀(V₂/V₁)

Ters dönüşüm:
  P₂/P₁ = 10^(G_dB/10)
  V₂/V₁ = 10^(G_dB/20)

Mutlak seviye — dBm (ref. 1 mW):
  P_dBm = 10·log₁₀(P_mW)
  P_mW = 10^(P_dBm/10)
  P_W = 10^((P_dBm − 30)/10)

Referans empedansta RMS gerilim:
  P = V²/R  →  V_RMS = √(P·Z₀)`}</pre>

          {r.ok && (
            <ul className="detail-list">
              {r.mode === MODE_DBM ? (
                <>
                  <li>
                    Referansa oran P/1 mW = {fmt(r.powerRatio, 6)}; 10·log₁₀ ile{' '}
                    {fmt(r.dBm, 6)} dBm.
                  </li>
                  <li>
                    {fmtOhm(r.Z)} üzerinde V_RMS = √({fmtEng(r.W, 'W', 5)} · {fmtOhm(r.Z)}) ={' '}
                    {fmtVolt(r.Vrms)}.
                  </li>
                  <li>
                    W ve mW aynı seviyeden bağımsız olarak türetilir: 10^((dBm−30)/10) ile
                    10^(dBm/10)/1000 aynı sonucu verir.
                  </li>
                </>
              ) : (
                <>
                  <li>
                    Güç oranı {fmt(r.powerRatio, 6)}; 10·log₁₀ ile {fmt(r.dB, 6)} dB.
                  </li>
                  <li>
                    Aynı dB değerinin gerilim oranı karşılığı 10^(G/20) = {fmt(r.voltageRatio, 6)};
                    güç oranı bunun karesidir.
                  </li>
                  <li>
                    Hesap {r.mode === MODE_VOLTAGE ? 'gerilim' : 'güç'} oranı üzerinden yürütüldü;
                    diğer oran aynı dB değerinden türetildi.
                  </li>
                </>
              )}
              <li>Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.</li>
            </ul>
          )}

          <h2 className="section">Geçerlilik ve varsayımlar</h2>
          <ul className="detail-list">
            <li className="w">{EQUAL_Z_NOTE}</li>
            <li>
              Gerilim oranı hesabında iki gerilimin aynı türden olduğu varsayılır; RMS ile tepe
              değeri karıştırılırsa sonuç sabit bir hata taşır.
            </li>
            <li className="w">{METHOD_NOTE}</li>
            <li>
              dBm 1 mW referansına bağlıdır. dBW (1 W), dBµV (1 µV) gibi başka referanslarla
              karıştırılmamalıdır: dBm = dBW + 30.
            </li>
            <li>
              RMS gerilim karşılığı, gücün tamamının referans empedans üzerinde harcandığını
              varsayar. Uyumsuz hatta yansıyan güç bu varsayımı bozar.
            </li>
            <li>
              Model yalnızca cebirsel dönüşüm yapar; frekans bağımlılığı, gürültü tabanı ve
              doğrusal olmayan davranış hesaba katılmaz.
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
              items={chartSeries.map((x, i) => ({ label: x.name, tone: toneClass(i), kind: 'line' }))}
            />

            <LineChart
              xScale="log"
              xLabel={chart.x}
              yLabel={chart.y}
              series={chartSeries}
              marker={{ ...s.marker, label: 'seçilen' }}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => fmt(v, 3)}
              caption={chart.caption}
            />

            <ChartDataTable
              xLabel={chart.x}
              series={chartSeries}
              every={5}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => `${fmt(v, 3)} ${s.kind === 'dbm' ? 'dBm' : 'dB'}`}
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
