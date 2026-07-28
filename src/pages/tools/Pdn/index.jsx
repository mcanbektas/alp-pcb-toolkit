import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import Segmented from '../../../components/Segmented'
import RowList from '../../../components/RowList'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import useToolForm from '../../../hooks/useToolForm'
import { fmt, fmtEng, fmtRes, fmtVolt, THOUSANDS_MESSAGE } from '../../../lib/num'
import PdnSchematic from './schematic'
import {
  INITIAL_FORM, SOURCES, SRC_TOLERANCE, TOGGLES, ON,
  CAP_COLUMNS_A, CAP_COLUMNS_B, CAP_ROW_LABEL,
  compute, buildSweep,
} from './model'
import {
  SOURCE_LABEL, TOGGLE_LABEL, LOOP_TERM_LABEL,
  FLAT_TARGET_NOTE, MOUNTING_NOTE, CHART, CHART_EMPTY, FOP_OUTSIDE_NOTE,
  reasonText, commentary,
} from './text'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }

const FORMULA = `Hedef empedans — spec §8.1:
  ΔV_izin = V_ray · T% / 100
  Z_hedef = ΔV_izin / ΔI

  Sabit YATAY hedef. Frekansa
  bağlı hedef profil spec'te
  anılıyor ama denklemi
  verilmiyor → UYGULANMADI.

Düzlem kapasitesi — spec §8.2.3:
  C_düzlem = ε₀·εr·A / d
  kenar saçılması DENKLEMDE YOK

Toplam empedans — spec §8.2.4:
  Z_PDN(ω) = [ 1/Z_VRM
             + 1/Z_kap
             + jω·C_düzlem ]⁻¹

  Z_kap(ω) = [ Σ 1/Z_i(ω) ]⁻¹
  Z_i(ω) =
    ESR + j(ω·ESL − 1/(ω·C))

  Z_VRM = R + jωL
    VRM modeli spec'te
    TANIMLI DEĞİL; değerler
    kullanıcıdan gelir.

  Düzlem yalnızca jωC — KAYIPSIZ.

Loop endüktansı — spec §8.2.4:
  L_loop = ESL_komponent + L_mount
         + L_via + L_yayılma

  Eğriye DAHİL DEĞİL, ayrı
  eklenir. Üç terimin denklemi
  spec'te yok; değerler
  kullanıcıdan gelir.`

export default function Pdn() {
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
    ? [
        { key: 'pdn', name: '|Z_PDN|', tone: toneClass(0), points: s.points },
        ...(s.hasCaps
          ? [{ key: 'caps', name: '|Z_kapasitörler|', tone: toneClass(1), points: s.capPoints }]
          : []),
      ]
    : []

  return (
    <>
      <div className="tool-header">
        <h1>PDN Target Impedance</h1>
        <p>
          Ray gerilimi, tolerans ve ani yük değişiminden hedef empedansı bulur; istenirse VRM,
          kapasitör bankası ve düzlem kapasitesinden PDN empedans eğrisini hedef çizgisiyle aynı
          grafikte çizer ve bağlantı loop endüktansını ayrıca toplar.
        </p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>Girdiler</h2>

          <PdnSchematic r={r} />

          <Segmented
            value={f.source}
            onChange={set('source')}
            options={SOURCES.map((x) => ({ value: x, label: SOURCE_LABEL[x] }))}
          />

          {f.source === SRC_TOLERANCE ? (
            <>
              <NumberField
                label="Ray gerilimi (V_ray)"
                value={f.Vrail} onChange={set('Vrail')}
                units={['V', 'mV']} unit={f.Vrailu} onUnit={set('Vrailu')}
              />
              <NumberField
                label="Gerilim toleransı"
                value={f.tolerancePct} onChange={set('tolerancePct')}
                units={['%']} unit="%" onUnit={() => {}}
                hint="İzin verilen ΔV bu yüzdeden türetilir"
              />
            </>
          ) : (
            <NumberField
              label="İzin verilen gerilim değişimi (ΔV)"
              value={f.deltaV} onChange={set('deltaV')}
              units={['mV', 'V']} unit={f.deltaVu} onUnit={set('deltaVu')}
              hint="Ray gerilimi ve tolerans yüzdesi bu modda kullanılmaz"
            />
          )}

          <NumberField
            label="Ani yük değişimi (ΔI)"
            value={f.deltaI} onChange={set('deltaI')}
            units={['A', 'mA']} unit={f.deltaIu} onUnit={set('deltaIu')}
            hint="Yükün en kötü akım sıçraması"
          />

          <SelectField
            label="PDN eğrisini de çiz"
            value={f.curve} onChange={set('curve')}
            options={TOGGLES.map((x) => ({ value: x, label: TOGGLE_LABEL[x] }))}
            hint="Kapalıyken ekran yalnızca hedef empedansı verir"
          />

          {f.curve === ON && (
            <>
              <NumberField
                label="Çalışma frekansı"
                value={f.fOp} onChange={set('fOp')}
                units={['MHz', 'kHz', 'GHz', 'Hz']} unit={f.fOpu} onUnit={set('fOpu')}
                hint="Grafikteki işaretli nokta"
              />

              <NumberField
                label="VRM çıkış direnci (R)"
                value={f.vrmR} onChange={set('vrmR')}
                units={['mΩ', 'Ω']} unit={f.vrmRu} onUnit={set('vrmRu')}
                hint="Boş bırakılabilir"
              />
              <NumberField
                label="VRM endüktansı (L)"
                value={f.vrmL} onChange={set('vrmL')}
                units={['nH', 'pH']} unit={f.vrmLu} onUnit={set('vrmLu')}
                hint="VRM modeli R + jωL olarak alınır"
              />

              <RowList
                label="Kapasitör bankası — kapasite ve ESR"
                rows={f.caps}
                columns={CAP_COLUMNS_A}
                onChange={set('caps')}
                rowLabel={CAP_ROW_LABEL}
                addLabel="Kapasitör ekle"
                hint="Her satır bir kapasitör tipidir; ESR sıfır olamaz"
              />

              <RowList
                label="Aynı satırlar — ESL ve adet"
                rows={f.caps}
                columns={CAP_COLUMNS_B}
                onChange={set('caps')}
                rowLabel={CAP_ROW_LABEL}
                addLabel="Kapasitör ekle"
                hint="Satır numaraları üstteki listeyle birebir aynıdır"
              />

              <SelectField
                label="Düzlem kapasitesini de ekle"
                value={f.plane} onChange={set('plane')}
                options={TOGGLES.map((x) => ({ value: x, label: TOGGLE_LABEL[x] }))}
              />

              {f.plane === ON && (
                <>
                  <NumberField
                    label="Örtüşen düzlem alanı (A)"
                    value={f.area} onChange={set('area')}
                    units={['cm²', 'mm²', 'm²']} unit={f.areau} onUnit={set('areau')}
                  />
                  <NumberField
                    label="Dielektrik kalınlığı (d)"
                    value={f.d} onChange={set('d')}
                    units={['mm', 'µm']} unit={f.du} onUnit={set('du')}
                  />
                  <NumberField
                    label="Dielektrik sabiti (εr)"
                    value={f.epsR} onChange={set('epsR')}
                    units={['']} unit="" onUnit={() => {}}
                  />
                </>
              )}
            </>
          )}

          <SelectField
            label="Bağlı loop endüktansını da hesapla"
            value={f.loop} onChange={set('loop')}
            options={TOGGLES.map((x) => ({ value: x, label: TOGGLE_LABEL[x] }))}
            hint="Eğriye girmez, ayrı değerlendirilir"
          />

          {f.loop === ON && (
            <>
              <NumberField
                label="Komponent ESL"
                value={f.eslComp} onChange={set('eslComp')}
                units={['nH', 'pH']} unit={f.eslCompu} onUnit={set('eslCompu')}
              />
              <NumberField
                label="Montaj endüktansı (L_mount)"
                value={f.Lmount} onChange={set('Lmount')}
                units={['nH', 'pH']} unit={f.Lmountu} onUnit={set('Lmountu')}
              />
              <NumberField
                label="Via endüktansı (L_via)"
                value={f.Lvia} onChange={set('Lvia')}
                units={['nH', 'pH']} unit={f.Lviau} onUnit={set('Lviau')}
              />
              <NumberField
                label="Düzlem yayılma endüktansı (L_yayılma)"
                value={f.Lspread} onChange={set('Lspread')}
                units={['nH', 'pH']} unit={f.Lspreadu} onUnit={set('Lspreadu')}
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
              <p className="empty-note">
                {reasonText(r.reason)}
                {r.invalid && r.invalid.length > 0 && ` Etkilenen alan: ${r.invalid.join(', ')}.`}
              </p>
            )
          ) : (
            <>
              <div className="big-result">
                <div className="label">Hedef empedans (Z_hedef)</div>
                <div className="value">{fmtRes(r.Ztarget, 4)}</div>
                <div className="alt">
                  ΔV = {fmtVolt(r.deltaV)} &nbsp;·&nbsp; ΔI = {fmtEng(r.deltaI, 'A', 4)}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <p className="method-note">{FLAT_TARGET_NOTE}</p>
              {r.curve && <p className="method-note">{MOUNTING_NOTE}</p>}

              <table className="result-table">
                <tbody>
                  <tr>
                    <td>Hedef empedans (Z_hedef)</td>
                    <td>{fmtRes(r.Ztarget, 5)}</td>
                  </tr>
                  <tr>
                    <td>İzin verilen gerilim değişimi (ΔV)</td>
                    <td>{fmtVolt(r.deltaV)}</td>
                  </tr>
                  <tr>
                    <td>ΔV nereden geldi</td>
                    <td>{r.fromTolerance ? 'ray × tolerans' : 'doğrudan girildi'}</td>
                  </tr>
                  <tr>
                    <td>Ani yük değişimi (ΔI)</td>
                    <td>{fmtEng(r.deltaI, 'A', 5)}</td>
                  </tr>
                  <tr>
                    <td>Ray gerilimi (V_ray)</td>
                    <td>{r.Vrail != null ? fmtVolt(r.Vrail) : '—'}</td>
                  </tr>
                  <tr>
                    <td>Gerilim toleransı</td>
                    <td>{r.tolerancePct != null ? `%${fmt(r.tolerancePct, 4)}` : '—'}</td>
                  </tr>
                  <tr>
                    <td>Frekansa bağlı hedef profil</td>
                    <td>{r.flatTarget ? 'yok — sabit yatay hedef' : '—'}</td>
                  </tr>
                </tbody>
              </table>

              {r.plane && (
                <>
                  <h2 className="section">Düzlem kapasitesi</h2>
                  <table className="result-table">
                    <tbody>
                      <tr>
                        <td>Düzlem kapasitesi (C_düzlem)</td>
                        <td>{fmtEng(r.plane.C, 'F', 5)}</td>
                      </tr>
                      <tr>
                        <td>Örtüşen alan (A)</td>
                        <td>{fmt(r.plane.area * 1e4, 4)} cm²</td>
                      </tr>
                      <tr>
                        <td>Dielektrik kalınlığı (d)</td>
                        <td>{fmtEng(r.plane.d, 'm', 4)}</td>
                      </tr>
                      <tr>
                        <td>Dielektrik sabiti (εr)</td>
                        <td>{fmt(r.plane.epsR, 4)}</td>
                      </tr>
                      <tr>
                        <td>Kenar saçılması dahil mi</td>
                        <td>{r.plane.fringingIncluded ? 'evet' : 'hayır'}</td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}

              {r.loop && (
                <>
                  <h2 className="section">Bağlı loop endüktansı</h2>
                  <table className="result-table">
                    <tbody>
                      <tr>
                        <td>Toplam (L_loop)</td>
                        <td>{fmtEng(r.loop.total, 'H', 5)}</td>
                      </tr>
                      <tr>
                        <td>Komponent ESL</td>
                        <td>
                          {fmtEng(r.loop.eslComponent, 'H', 4)}{' '}
                          <span className="sub">(%{fmt(r.loop.shares.component * 100, 3)})</span>
                        </td>
                      </tr>
                      <tr>
                        <td>Montaj (L_mount)</td>
                        <td>
                          {fmtEng(r.loop.Lmount, 'H', 4)}{' '}
                          <span className="sub">(%{fmt(r.loop.shares.mount * 100, 3)})</span>
                        </td>
                      </tr>
                      <tr>
                        <td>Via (L_via)</td>
                        <td>
                          {fmtEng(r.loop.Lvia, 'H', 4)}{' '}
                          <span className="sub">(%{fmt(r.loop.shares.via * 100, 3)})</span>
                        </td>
                      </tr>
                      <tr>
                        <td>Düzlem yayılması (L_yayılma)</td>
                        <td>
                          {fmtEng(r.loop.Lspread, 'H', 4)}{' '}
                          <span className="sub">(%{fmt(r.loop.shares.spread * 100, 3)})</span>
                        </td>
                      </tr>
                      <tr>
                        <td>Baskın terim</td>
                        <td>{LOOP_TERM_LABEL[r.dominant]}</td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}

              {r.curve && (
                <>
                  <h2 className="section">PDN eğrisi</h2>
                  <table className="result-table">
                    <tbody>
                      <tr>
                        <td>Çalışma frekansı</td>
                        <td>{fmtEng(r.curve.fOp, 'Hz', 5)}</td>
                      </tr>
                      <tr>
                        <td>|Z_PDN| (çalışma frekansında)</td>
                        <td>{fmtRes(r.curve.z.mag, 5)}</td>
                      </tr>
                      <tr>
                        <td>Hedefin altında mı</td>
                        <td>{r.belowTarget ? 'evet' : 'hayır'}</td>
                      </tr>
                      <tr>
                        <td>Yalnız kapasitör ağı |Z_kap|</td>
                        <td>{r.curve.z.capsMag != null ? fmtRes(r.curve.z.capsMag, 5) : '—'}</td>
                      </tr>
                      <tr>
                        <td>Bu frekansta ağ endüktif mi</td>
                        <td>{r.curve.z.inductive ? 'evet' : 'hayır'}</td>
                      </tr>
                      <tr>
                        <td>En kötü nokta (1 kHz – 1 GHz)</td>
                        <td>
                          {r.curve.sweep.worst ? (
                            <>
                              {fmtRes(r.curve.sweep.worst.mag, 4)}{' '}
                              <span className="sub">@ {fmtEng(r.curve.sweep.worst.f, 'Hz', 3)}</span>
                            </>
                          ) : '—'}
                          {!r.curve.fOpInSweep && (
                            <>
                              {' '}
                              <span className="sub">({FOP_OUTSIDE_NOTE})</span>
                            </>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td>Hedefin aşıldığı bant sayısı</td>
                        <td>
                          {fmt(r.curve.sweep.bands.length, 2)}{' '}
                          <span className="sub">
                            ({fmt(r.curve.sweep.exceedCount, 3)} / {fmt(r.curve.sweep.total, 3)} nokta)
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>Bağlı loop endüktansı dahil mi</td>
                        <td>{r.curve.z.mountingIncluded ? 'evet' : 'hayır'}</td>
                      </tr>
                      <tr>
                        <td>Düzlem kayıpsız mı modellendi</td>
                        <td>{r.curve.z.losslessPlane ? 'evet' : 'düzlem yok'}</td>
                      </tr>
                      <tr>
                        <td>Bankadaki toplam kapasitör</td>
                        <td>{fmt(r.curve.capCount, 4)} adet</td>
                      </tr>
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

          <pre className="formula">{FORMULA}</pre>

          {r.ok && (
            <ul className="detail-list">
              <li>
                Hedef empedans sabit yatay yaklaşımdan geliyor; sonucun `flatTarget` alanı bunu
                taşır ve arayüz frekansa bağlı bir profil varmış gibi göstermez.
              </li>
              <li>
                ΔV kaynağı: {r.fromTolerance
                  ? 'ray gerilimi × tolerans yüzdesi'
                  : 'doğrudan girilen değer'}.
              </li>
              {r.plane && (
                <li>
                  Düzlem kapasitesi ε₀·εr·A/d ile hesaplandı; `fringingIncluded` alanı false —
                  kenar saçılması denklemde yok.
                </li>
              )}
              {r.curve && (
                <li>
                  Eğri {r.curve.sweep.total} noktada, 1 kHz – 1 GHz arasında logaritmik olarak
                  örneklendi. Kapasitör ağı KOMPLEKS admitans toplamıyla birleştirildi; büyüklükler
                  toplansaydı anti-rezonans tepeleri kaybolurdu.
                </li>
              )}
              {r.curve && (
                <li>
                  VRM {r.curve.vrm ? 'R + jωL olarak modellendi' : 'girilmedi'}; bu model spec'te
                  tanımlı değildir ve değerleri kullanıcıdan gelir.
                </li>
              )}
              {r.loop && (
                <li>
                  Loop endüktansı yalnızca toplanır; L_mount, L_via ve L_yayılma için denklem
                  spec'te yok, değerler kullanıcıdan ya da alan çözücüden gelir.
                </li>
              )}
              <li>Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.</li>
            </ul>
          )}

          <h2 className="section">Geçerlilik ve varsayımlar</h2>
          <ul className="detail-list">
            <li>
              Hedef empedans yalnızca bir yaklaşımdır: sabit ve yatay kabul edilir. Gerçek
              tasarımda yük akımının spektrumu düz değildir; frekansa bağlı bir hedef profil daha
              doğrudur ama denklemi docs/spec.md'de verilmediği için bu araçta yoktur.
            </li>
            <li>
              Düzlem kapasitesi denkleminde kenar saçılması bulunmaz; gerçek kapasite hesaplanandan
              biraz büyüktür.
            </li>
            <li>
              Aynı satırdaki N kapasitör için ESL'in 1/N azaldığı varsayılır. Ortak via ya da ortak
              dar bir bağlantı varsa bu azalma gerçekleşmez ve gerçek empedans daha yüksek olur.
            </li>
            <li>
              VRM modeli docs/spec.md'de tanımlı değildir. Burada kullanıcının girdiği değerlerle
              R + jωL alınmıştır; kontrol döngüsü bant genişliği, yük geçiş yanıtı ve anahtarlama
              frekansı modelde yoktur.
            </li>
            <li>
              Düzlem kayıpsız (yalnızca jωC) modellenmiştir. Bu yüzden ürettiği anti-rezonans
              tepesi sönümsüzdür ve gerçek tepeden yüksektir; tepe yüksekliği üst sınır olarak
              okunmalıdır.
            </li>
            <li>
              Bağlantı loop endüktansı PDN eğrisine dahil edilmez; sonucun `mountingIncluded` alanı
              false döner. Yüksek frekans davranışı için ayrıca değerlendirilmelidir.
            </li>
            <li>
              Kapasitörlerin yerleşimi, düzlem yayılma direnci ve dielektrik kaybı modelde yoktur;
              hepsi gerçek eğriyi değiştirir.
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
                { label: '|Z_PDN|', tone: toneClass(0), kind: 'line' },
                ...(s.hasCaps
                  ? [{ label: '|Z_kapasitörler|', tone: toneClass(1), kind: 'line' }]
                  : []),
                { label: 'hedef empedans', tone: 'tone-muted', kind: 'line' },
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
                label: `hedef ${fmtRes(ref.real, 3)}`,
              }))}
              marker={s.marker ? { ...s.marker, label: 'çalışma frekansı' } : null}
              formatX={(v) => fmtEng(v, 'Hz', 3)}
              formatY={(v) => fmtRes(Math.pow(10, v), 3)}
              caption={CHART.caption}
            />

            <ChartDataTable
              xLabel={CHART.x}
              series={chartSeries}
              every={8}
              formatX={(v) => fmtEng(v, 'Hz', 3)}
              formatY={(v) => fmtRes(Math.pow(10, v), 4)}
            />
          </>
        ) : (
          <p className="empty-note">{CHART_EMPTY}</p>
        )}
      </section>

      <Link className="backlink" to="/kategori/guc-termal">← Güç Bütünlüğü ve Termal</Link>
    </>
  )
}
