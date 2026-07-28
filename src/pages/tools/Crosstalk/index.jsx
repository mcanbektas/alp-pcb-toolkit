import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import Segmented from '../../../components/Segmented'
import EpsEffFields, { epsEffRows } from '../../../components/EpsEffFields'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import useToolForm from '../../../hooks/useToolForm'
import { fmt, fmtEng, fmtRes, THOUSANDS_MESSAGE } from '../../../lib/num'
import CrosstalkSchematic from './schematic'
import {
  INITIAL_FORM, FEXT_OFF, FEXT_ON,
  DIM_UNITS, LEN_UNITS, TIME_UNITS, VOLT_UNITS,
  compute, buildSweep,
} from './model'
import {
  CHART, METHOD_NOTE, SOURCE_NOTE, THREE_W_NOTE, MODAL_EPS_HINT, THRESHOLD_NOTE,
  reasonText, commentary,
} from './text'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }

const FORMULA = `Tanımı belirsizlik taşımayan
TEK ifade — yalnızca geometrik
kontrol:
  S ≥ 3·W

Kestirim — AMPİRİK, doğrulanmış
kaynağa dayanmıyor:
  K_b = (Z_even − Z_odd)
        / (2·(Z_even + Z_odd))
  L_sat = t_r / (2·t'_pd)
  ölçek = L ≥ L_sat
          ? 1 : L / L_sat
  V_NEXT = K_b · V_agg · ölçek
  t_NEXT = 2·L·t'_pd

  Δt = |t'_pd,even − t'_pd,odd|
       · L
  V_FEXT ≈ (Δt / t_r) · V_agg / 2

Çok iletkenli hat çözümü
— UYGULANMADI:
  ∂V/∂x = −(R + jωL)·I
  ∂I/∂x = −(G + jωC)·V
  Z = R + jωL,  Y = G + jωC
  M = [[0, Z], [Y, 0]]
  X(ℓ) = e^(−M·ℓ) · X(0)
  L = μ₀ε₀·C₀⁻¹
    (vakum kapasitans matrisinden)
  G ≈ ω·tanδ·C
    (homojen dielektrik yaklaşımı)
  C matrisi 2B alan çözücüden
  gelir; aggressor sinyali FFT →
  her frekansta çözüm → IFFT ile
  NEXT/FEXT dalga biçimi.
  Alan çözücü olmadığı için
  hiçbir adımı yapılamadı.`

export default function Crosstalk() {
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
    ? [{ key: 'vnext', name: 'V_NEXT', tone: toneClass(0), points: s.points }]
    : []

  return (
    <>
      <Link className="backlink" to="/kategori/sinyal-butunlugu">← Sinyal Bütünlüğü</Link>

      <div className="tool-header">
        <h1>Crosstalk Estimator</h1>
        <p>
          Paralel iki hat arasındaki near-end crosstalk tepe gerilimini, doyma uzunluğunu ve NEXT
          süresini kestirir; S ≥ 3·W geometrik kontrolünü yapar. Modal εeff değerleri girilirse
          far-end crosstalk da hesaplanır. Sonuç çok iletkenli iletim hattı çözümünden gelmez —
          kaba bir kestirimdir.
        </p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>Girdiler</h2>

          <CrosstalkSchematic r={r} />

          <EpsEffFields f={f} set={set} />

          <NumberField
            label="Even mod empedansı (Z_even)"
            value={f.Zeven} onChange={set('Zeven')}
            units={['Ω']} unit="Ω" onUnit={() => {}}
            hint="Kuplajlı çiftte Z_even her zaman Z_odd'dan büyüktür"
          />

          <NumberField
            label="Odd mod empedansı (Z_odd)"
            value={f.Zodd} onChange={set('Zodd')}
            units={['Ω']} unit="Ω" onUnit={() => {}}
          />

          <NumberField
            label="Kuplajlı hat genişliği (W)"
            value={f.W} onChange={set('W')}
            units={DIM_UNITS} unit={f.Wu} onUnit={set('Wu')}
          />

          <NumberField
            label="Hat aralığı (S)"
            value={f.S} onChange={set('S')}
            units={DIM_UNITS} unit={f.Su} onUnit={set('Su')}
            hint="Kenar-kenar mesafe; 3W geometrik kontrolü bu değerle yapılır"
          />

          <NumberField
            label="Paralel uzunluk"
            value={f.len} onChange={set('len')}
            units={LEN_UNITS} unit={f.lenu} onUnit={set('lenu')}
            hint="İki hattın yan yana ilerlediği uzunluk"
          />

          <NumberField
            label="Yükselme süresi (t_r)"
            value={f.tr} onChange={set('tr')}
            units={TIME_UNITS} unit={f.tru} onUnit={set('tru')}
          />

          <NumberField
            label="Aggressor gerilimi (V_agg)"
            value={f.Vagg} onChange={set('Vagg')}
            units={VOLT_UNITS} unit={f.Vaggu} onUnit={set('Vaggu')}
          />

          <h2 className="section">Far-end crosstalk</h2>

          <Segmented
            value={f.fextMode}
            onChange={set('fextMode')}
            options={[
              { value: FEXT_OFF, label: 'FEXT hesaplama' },
              { value: FEXT_ON, label: 'FEXT hesapla — modal εeff gir' },
            ]}
          />

          {f.fextMode === FEXT_ON ? (
            <>
              <NumberField
                label="Odd mod εeff"
                value={f.epsOdd} onChange={set('epsOdd')}
                units={['']} unit="" onUnit={() => {}}
                hint="Alan çözücüden ya da üretici yığın raporundan"
              />
              <NumberField
                label="Even mod εeff"
                value={f.epsEven} onChange={set('epsEven')}
                units={['']} unit="" onUnit={() => {}}
                hint={MODAL_EPS_HINT}
              />
            </>
          ) : (
            <p className="empty-note">{MODAL_EPS_HINT}</p>
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
                <div className="label">Near-end crosstalk tepe gerilimi</div>
                <div className="value">{fmtEng(r.Vnext, 'V', 4)}</div>
                <div className="alt">
                  aggressor geriliminin %{fmt(r.nextPct, 4)} kadarı &nbsp;·&nbsp;{' '}
                  {r.fext.available
                    ? <>FEXT {fmtEng(r.fext.Vfext, 'V', 4)} (%{fmt(r.fext.fextPct, 3)})</>
                    : 'FEXT: modal εeff girilmedi — hesaplanmadı'}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <p className="method-note">{METHOD_NOTE}</p>
              <p className="method-note">{SOURCE_NOTE}</p>
              <p className="method-note">{THREE_W_NOTE}</p>

              <table className="result-table">
                <tbody>
                  <tr>
                    <td>NEXT kuplaj katsayısı (K_b)</td>
                    <td>{fmt(r.Kb, 5)}</td>
                  </tr>
                  <tr>
                    <td>NEXT tepe gerilimi</td>
                    <td>{fmtEng(r.Vnext, 'V', 5)}</td>
                  </tr>
                  <tr>
                    <td>NEXT yüzdesi</td>
                    <td>{fmt(r.nextPct, 5)} %</td>
                  </tr>
                  <tr>
                    <td>Doyma uzunluğu (L_sat)</td>
                    <td>{fmtEng(r.Lsat, 'm', 5)}</td>
                  </tr>
                  <tr>
                    <td>Doymuş mu</td>
                    <td>{r.saturated ? 'evet' : 'hayır'}</td>
                  </tr>
                  <tr>
                    <td>Ölçek katsayısı</td>
                    <td>{fmt(r.scale, 5)}</td>
                  </tr>
                  <tr>
                    <td>NEXT süresi</td>
                    <td>{fmtEng(r.nextDuration, 's', 5)}</td>
                  </tr>
                  <tr>
                    <td>Paralel uzunluk</td>
                    <td>{fmtEng(r.coupledLength, 'm', 5)}</td>
                  </tr>
                  <tr>
                    <td>Aggressor gerilimi</td>
                    <td>{fmtEng(r.Vagg, 'V', 5)}</td>
                  </tr>
                  <tr>
                    <td>Yükselme süresi</td>
                    <td>{fmtEng(r.tr, 's', 5)}</td>
                  </tr>
                  <tr>
                    <td>Z_even · Z_odd</td>
                    <td>{fmtRes(r.Zeven, 4)} · {fmtRes(r.Zodd, 4)}</td>
                  </tr>

                  <tr className="mini-head">
                    <td>3W geometrik kontrolü</td>
                    <td>{r.geom.satisfied ? 'sağlandı' : 'sağlanmadı'}</td>
                  </tr>
                  <tr>
                    <td>S / W oranı</td>
                    <td>{fmt(r.geom.ratio, 5)}</td>
                  </tr>
                  <tr>
                    <td>Gereken aralık (3·W)</td>
                    <td>{fmtEng(r.geom.required, 'm', 5)}</td>
                  </tr>
                  <tr>
                    <td>Girilen aralık (S) · genişlik (W)</td>
                    <td>{fmtEng(r.S, 'm', 4)} · {fmtEng(r.W, 'm', 4)}</td>
                  </tr>

                  {r.fext.available ? (
                    <>
                      <tr className="mini-head">
                        <td>Far-end crosstalk</td>
                        <td>hesaplandı</td>
                      </tr>
                      <tr>
                        <td>Odd · even mod εeff</td>
                        <td>{fmt(r.fext.epsEffOdd, 4)} · {fmt(r.fext.epsEffEven, 4)}</td>
                      </tr>
                      <tr>
                        <td>Modal gecikme farkı (Δt)</td>
                        <td>{fmtEng(r.fext.modalDelayDiff, 's', 5)}</td>
                      </tr>
                      <tr>
                        <td>FEXT tepe gerilimi</td>
                        <td>{fmtEng(r.fext.Vfext, 'V', 5)}</td>
                      </tr>
                      <tr>
                        <td>FEXT yüzdesi</td>
                        <td>{fmt(r.fext.fextPct, 5)} %</td>
                      </tr>
                      <tr>
                        <td>Modal hızlar homojen mi</td>
                        <td>{r.fext.homogeneous ? 'evet — FEXT sıfır' : 'hayır'}</td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr className="mini-head">
                        <td>Far-end crosstalk</td>
                        <td>hesaplanmadı</td>
                      </tr>
                      <tr>
                        <td>Neden</td>
                        <td>modal εeff girilmedi</td>
                      </tr>
                    </>
                  )}

                  <tr className="mini-head">
                    <td>Yöntem</td>
                    <td>{r.method}</td>
                  </tr>
                  <tr>
                    <td>Çok iletkenli model uygulandı mı</td>
                    <td>{r.multiconductorModel ? 'evet' : 'hayır'}</td>
                  </tr>

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
                Sonucun yöntem etiketi `{r.method}`; çok iletkenli model uygulandı mı:{' '}
                {r.multiconductorModel ? 'evet' : 'hayır'}. Bu etiket kapalı form sonuçlarının
                taşıdığı `closed-form` etiketiyle aynı güven seviyesinde değildir.
              </li>
              <li>
                K_b = {fmt(r.Kb, 5)}; doyma uzunluğu {fmtEng(r.Lsat, 'm', 4)}, ölçek katsayısı{' '}
                {fmt(r.scale, 4)} (uzunluk L_sat değerinin altındaysa doğrusal ölçekleme).
              </li>
              <li>
                NEXT süresi gidiş dönüş gecikmesidir: 2·L·t′_pd = {fmtEng(r.nextDuration, 's', 4)}.
                Tepe değerin ne kadar sürdüğünü gösterir, ne kadar büyük olduğunu değil.
              </li>
              <li>
                3W kontrolü kayan nokta karşılaştırmasını bağıl toleransla yapar; tam sınırdaki
                geometri (S = 3·W) yanlışlıkla "sağlanmadı" görünmez.
              </li>
              <li>
                {r.fext.available
                  ? `FEXT modal gecikme farkından hesaplandı: Δt = ${fmtEng(r.fext.modalDelayDiff, 's', 4)}. Δt ≪ t_r varsayımı geçerli olduğu sürece anlamlıdır.`
                  : 'FEXT hesaplanmadı — modal εeff değerleri girilmedi. Motor bu iki değere ≥ 1 eşiği uygular; altındaki bir değer FEXT\'i hesaplatmaz.'}
              </li>
              <li>{THRESHOLD_NOTE}</li>
              <li>Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.</li>
            </ul>
          )}

          <h2 className="section">Geçerlilik ve varsayımlar</h2>
          <ul className="detail-list">
            <li>
              <strong>Bilinen sapma — çok iletkenli hat çözümü uygulanmadı.</strong> O çözüm
              kapasitans matrisini 2B alan çözücüden alır, endüktans matrisini L = μ₀ε₀·C₀⁻¹,
              iletkenlik matrisini G ≈ ω·tanδ·C ile kurar; aggressor sinyalini FFT ile frekans
              alanına taşır, her frekansta e^(−Mℓ) çözer, IFFT ile zaman alanına döner. Alan
              çözücü olmadığı için bu adımların hiçbiri yapılmadı. Bu ekran dalga biçimi üretmez.
            </li>
            <li>
              <strong>Kullanılan ifadeler ampiriktir.</strong> K_b, L_sat ve V_FEXT
              bağıntılarının sayısal biçimi ve geçerlilik aralığı doğrulanmış bir kaynağa
              dayanmıyor. Sonuç bu yüzden `empirical-coupling` etiketi ve
              "çok iletkenli model: hayır" bayrağı taşır.
            </li>
            <li>
              <strong>Hat aralığı duyarlılık grafiği üretilmedi.</strong> Alttaki parametrik
              grafik hat aralığı duyarlılığı yerine paralel uzunluk taraması
              çiziyor. Nedeni: bu ekranda Z_odd ve Z_even
              kullanıcıdan gelir ve hat aralığına bağlı bir modelleri yoktur — aralık
              süpürüldüğünde K_b hiç değişmez, dolayısıyla duyarlılık eğrisi üretilemez. Aralık
              duyarlılığı için Z_odd/Z_even'in aralıkla birlikte değişmesi gerekir; o da
              kapasitans matrisi, yani 2B alan çözücü işidir. Hat aralığı bu ekranda yalnızca
              3W geometrik kontrolüne girer.
            </li>
            <li>
              <strong>3W yalnızca geometrik bir kontroldür.</strong> Bu ekranda tanımı belirsizlik
              taşımayan tek ifade S ≥ 3·W'dir ve o da görsel bir tasarım kontrolüdür.
              Sağlandığında "3W geometrik kuralı sağlandı" denir; "crosstalk yoktur" denmez.
            </li>
            <li>
              Bu ekranın sayılarıyla üretim kararı verilmemelidir. Gürültü bütçesi kapatma,
              yığın onayı veya kart çıkışı için alan çözücü sonucu ya da ölçüm gerekir.
            </li>
            <li>
              Z_even ve Z_odd kullanıcıdan gelir. Diferansiyel çift ekranından alındıysa o
              değerler de ampirik bir kuplaj katsayısından türemiştir; belirsizlik buraya
              doğrudan geçer.
            </li>
            <li>
              Far-end crosstalk modal hız farkına bağlıdır ve Z_odd/Z_even değerlerinden
              türetilemez. Tek bir εeff kullanan bir model iki modu aynı hızda kabul eder ve FEXT
              katsayısı K_f = −½·t'_pd·(C_m/C − L_m/L) özdeş olarak sıfır çıkar; microstrip'te bu
              yanlıştır. Bu yüzden modal εeff girilmezse sayı üretilmez.
            </li>
            <li>
              Odd ve even mod εeff eşitse FEXT sıfır çıkar ve bu DOĞRUDUR — homojen dielektrikte
              (stripline) iki mod aynı hızda ilerler. Bu durum "hesaplanamadı" durumundan farklıdır
              ve tabloda ayrı gösterilir.
            </li>
            <li>
              Kestirim tek bir aggressor içindir. Birden fazla aggressor, dönüş yolu süreksizliği,
              via geçişi, konnektör ve düzlem yarıkları hesaba katılmaz; gerçek kartta bunlar
              baskın olabilir.
            </li>
            <li>
              Victim hattının sonlandırması, kaynak ve yük empedansları modele girmez. Çok
              iletkenli hat çözümü bunları girdi olarak kullanır; bu kestirim kullanamaz.
            </li>
            <li>
              Kayıp (R, G) ve dispersiyon ihmal edilir; εeff frekanstan bağımsız alınır.
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
                { label: 'V_NEXT', tone: toneClass(0), kind: 'line' },
                { label: 'doyma seviyesi', tone: 'tone-muted', kind: 'line' },
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
                label: `doyma — L_sat = ${fmt(s.LsatMm, 4)} mm`,
              }))}
              marker={{ ...s.marker, label: 'çalışma noktası' }}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => fmt(v, 3)}
              caption={CHART.caption}
            />

            <ChartDataTable
              xLabel={CHART.x}
              series={chartSeries}
              every={6}
              formatX={(v) => `${fmt(v, 4)} mm`}
              formatY={(v) => fmtEng(v, 'V', 4)}
            />
          </>
        ) : (
          <p className="empty-note">Grafik için geçerli girdi gerekli.</p>
        )}
      </section>

    </>
  )
}
