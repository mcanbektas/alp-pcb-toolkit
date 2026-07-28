import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import Segmented from '../../../components/Segmented'
import EpsEffFields, { epsEffRows } from '../../../components/EpsEffFields'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import useToolForm from '../../../hooks/useToolForm'
import { fmt, fmtEng, THOUSANDS_MESSAGE } from '../../../lib/num'
import SkewSchematic from './schematic'
import { INITIAL_FORM, LAYERS, LAYER_DIFFERENT, compute, buildSweep } from './model'
import { CHART, LAYER_LABEL, METHOD_NOTE, SPEC_NOTE, reasonText, commentary } from './text'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }

const FORMULA = `Birim uzunluk gecikmesi:
  t'_pd = √εeff / c

Hat gecikmeleri:
  t_P = L_P·√εeff,P / c
  t_N = L_N·√εeff,N / c

Skew:
  t_skew = | t_P − t_N |

Uzunluk farkı:
  ΔL = | L_P − L_N |

Aynı katman (εeff,P = εeff,N):
  t_skew = ΔL·√εeff / c

İzin verilen skew bütçesinden:
  ΔL_max = c·t_skew,max / √εeff

Eşitlemek için gecikmesi küçük
olan hatta eklenecek uzunluk:
  aynı katman →
    ΔL_add = | L_P − L_N |
  farklı katman →
    ΔL_add = | t_P − t_N |
      / t'_pd(gecikmesi küçük
              olan hat)

NOT: spec §7.5'in denklem
bloklarının sol tarafları markdown
dönüşümünde düşmüş. Bloklar
tahminle tamamlanmadı; yukarıdaki
yazım lib/signalIntegrity.js
skew() uygulamasından alındı.`

export default function Skew() {
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
      { key: 'skew', name: 'skew', tone: toneClass(0), points: s.points },
      ...(s.differentLayer
        ? [{ key: 'same', name: 'aynı εeff varsayımı', tone: toneClass(1), points: s.samePoints }]
        : []),
    ]
    : []

  return (
    <>
      <Link className="backlink" to="/kategori/sinyal-butunlugu">← Sinyal Bütünlüğü</Link>

      <div className="tool-header">
        <h1>Differential Skew &amp; Length Matching</h1>
        <p>
          Diferansiyel çiftin iki hattı arasındaki gecikme farkını hesaplar; izin verilen skew
          bütçesinin uzunluk karşılığını ve eşitlemek için gecikmesi küçük olan hatta eklenmesi
          gereken uzunluğu verir. Hatlar farklı katmandaysa iki ayrı εeff ile çalışır.
        </p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>Girdiler</h2>

          <SkewSchematic r={r} />

          <EpsEffFields f={f} set={set} />

          <Segmented
            value={f.layer}
            onChange={set('layer')}
            options={LAYERS.map((x) => ({ value: x, label: LAYER_LABEL[x] }))}
          />

          {f.layer === LAYER_DIFFERENT && (
            <NumberField
              label="N hattı efektif dielektrik sabiti (εeff,N)"
              value={f.epsEffN} onChange={set('epsEffN')}
              units={['']} unit="" onUnit={() => {}}
              hint="Yukarıdaki εeff P hattı içindir; bu alan N hattının katmanı içindir"
            />
          )}

          <NumberField
            label="P hattı uzunluğu"
            value={f.lengthP} onChange={set('lengthP')}
            units={['mm', 'cm', 'm', 'mil', 'inch']} unit={f.lengthPu} onUnit={set('lengthPu')}
          />

          <NumberField
            label="N hattı uzunluğu"
            value={f.lengthN} onChange={set('lengthN')}
            units={['mm', 'cm', 'm', 'mil', 'inch']} unit={f.lengthNu} onUnit={set('lengthNu')}
          />

          <NumberField
            label="İzin verilen maksimum skew"
            value={f.skewMax} onChange={set('skewMax')}
            units={['ps', 'ns']} unit={f.skewMaxu} onUnit={set('skewMaxu')}
            hint="Komponent veri sayfasından ve protokol dokümanından gelir"
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
                <div className="label">Diferansiyel skew</div>
                <div className="value">{fmtEng(r.skew, 's', 4)}</div>
                <div className="alt">
                  ΔL = {fmtEng(r.deltaL, 'm', 4)} &nbsp;·&nbsp;{' '}
                  {r.addTo === null
                    ? 'gecikmeler eşit'
                    : `gecikmesi büyük hat: ${r.longer}`}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <p className="method-note">{METHOD_NOTE}</p>
              <p className="method-note">{SPEC_NOTE}</p>

              <table className="result-table">
                <tbody>
                  <tr>
                    <td>Skew</td>
                    <td>{fmtEng(r.skew, 's', 5)}</td>
                  </tr>
                  <tr>
                    <td>Uzunluk farkı (ΔL)</td>
                    <td>{fmtEng(r.deltaL, 'm', 5)}</td>
                  </tr>
                  <tr>
                    <td>P hattı gecikmesi</td>
                    <td>{fmtEng(r.delayP, 's', 5)}</td>
                  </tr>
                  <tr>
                    <td>N hattı gecikmesi</td>
                    <td>{fmtEng(r.delayN, 's', 5)}</td>
                  </tr>
                  <tr>
                    <td>t_pd (P)</td>
                    <td>{fmt(r.tpdPsPerMmP, 5)} ps/mm</td>
                  </tr>
                  <tr>
                    <td>t_pd (N)</td>
                    <td>{fmt(r.tpdPsPerMmN, 5)} ps/mm</td>
                  </tr>
                  <tr>
                    <td>Hatlar aynı katmanda mı</td>
                    <td>{r.sameLayer ? 'evet' : 'hayır'}</td>
                  </tr>
                  <tr>
                    <td>İzin verilen skew</td>
                    <td>{fmtEng(r.skewMax, 's', 5)}</td>
                  </tr>
                  <tr>
                    <td>İzin verilene karşılık gelen maksimum ΔL</td>
                    <td>{fmtEng(r.maxDeltaL, 'm', 5)}</td>
                  </tr>
                  <tr>
                    <td>Gecikmesi küçük olan hatta eklenecek uzunluk</td>
                    <td>
                      {fmtEng(r.addLength, 'm', 5)}
                      {r.addTo ? ` → ${r.addTo} hattı` : ''}
                    </td>
                  </tr>
                  {r.differentLayer && (
                    <tr>
                      <td>N hattı efektif dielektrik sabiti</td>
                      <td>{fmt(r.epsEffN, 5)}</td>
                    </tr>
                  )}
                  {r.differentLayer && Number.isFinite(r.sameEpsSkew) && (
                    <tr>
                      <td>Aynı εeff varsayımıyla skew</td>
                      <td>{fmtEng(r.sameEpsSkew, 's', 5)}</td>
                    </tr>
                  )}
                  {epsEffRows(r.eps, fmt).map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      <td>{row.value}</td>
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

          <pre className="formula">{FORMULA}</pre>

          {r.ok && (
            <ul className="detail-list">
              <li>
                εeff kaynağı: {r.eps.source === 'geometry'
                  ? `geometriden hesaplandı (${r.eps.model}, yöntem \`${r.eps.method}\`)`
                  : 'elle girildi'}.
              </li>
              <li>
                Hatlar aynı katmanda mı: {r.sameLayer ? 'evet' : 'hayır'}. Motor bu kararı iki
                εeff değerinin eşitliğine bakarak verir; farklı katman seçilip aynı değer
                girilirse sonuç aynı katman gibi çıkar.
              </li>
              <li>
                Bütçenin uzunluk karşılığı (ΔL_max) motorda her zaman P hattının t_pd değeriyle
                hesaplanır. Farklı katmanda bu sınır yalnızca P hattı için geçerlidir; N hattının
                kendi sınırını motor döndürmüyor.
              </li>
              <li>
                Spec §7.5 eklenecek uzunluğu yalnızca |L_P − L_N| olarak tanımlar ve farklı
                katman durumunda ne ekleneceğini söylemez. Motor o durumda gecikmeyi eşitleyen
                uzunluğu döndürür — bu, spec'te karşılığı olmayan bir genişletmedir ve burada
                olduğu gibi işaretlenir.
              </li>
              <li>
                Bu ekran skew bütçesini her zaman motora geçirir; motorun bütçesiz dalı
                kullanılmaz.
              </li>
              <li>Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.</li>
            </ul>
          )}

          <h2 className="section">Geçerlilik ve varsayımlar</h2>
          <ul className="detail-list">
            <li>
              Aynı katman varsayımı, iki hattın εeff değerinin eşit olması demektir. Yalnızca
              aynı katmanda olmak yetmez: farklı genişlik, farklı komşu düzlem veya farklı
              yerel yığın da εeff'i ayırır ve eşit uzunluk eşit gecikme vermez.
            </li>
            <li>
              Farklı katman seçildiğinde eşitlenen büyüklük fiziksel uzunluk değil gecikmedir.
              Spec §7.5 bu durumu açıkça uyarır: yalnızca fiziksel uzunluk eşitlemek yeterli
              olmayabilir.
            </li>
            <li>
              Eşitleme serpantin (meander) ile yapıldığında serpantinin kendi kuplajı devreye
              girer: yan yana gelen kollar yerel empedansı düşürür ve eklenen bakır uzunluğu
              kadar gecikme eklenmeyebilir. Bu ekran serpantin geometrisini modellemez; sonuç
              düz bir hat uzatması varsayar.
            </li>
            <li>
              Skew bütçesi bu ekranda üretilmez. İzin verilen maksimum skew, alıcı komponentin
              veri sayfasından ve protokol dokümanından gelmelidir; ekranın verdiği tek şey o
              bütçenin uzunluk karşılığıdır.
            </li>
            <li>
              Hat kayıpsız ve dispersiyonsuz kabul edilir; dielektrik sabiti frekanstan bağımsız
              alınır. Geniş bantlı sinyalde tek bir εeff yeterli değildir.
            </li>
            <li>
              Via geçişleri, konnektör, pad ve komponent içi gecikme farkları hesaba girmez.
              Gerçek sistemde bunlar da skew bütçesini tüketir.
            </li>
            <li>
              Çift içi (intra-pair) skew ile çiftler arası (inter-pair) skew ayrı bütçelerdir;
              bu ekran yalnızca tek bir çiftin iki hattını karşılaştırır.
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
                { label: 'skew', tone: toneClass(0), kind: 'line' },
                ...(s.differentLayer
                  ? [{ label: 'aynı εeff varsayımı', tone: toneClass(1), kind: 'line' }]
                  : []),
                { label: 'izin verilen skew', tone: 'tone-muted', kind: 'line' },
              ]}
            />

            <LineChart
              xScale="linear"
              xLabel={CHART.x}
              yLabel={CHART.y}
              series={chartSeries}
              refLines={s.refs.map((ref) => ({
                key: ref.key,
                y: ref.y,
                label: `izin verilen skew — ${fmt(ref.y, 3)} ps`,
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
              formatY={(v) => `${fmt(v, 4)} ps`}
            />
          </>
        ) : (
          <p className="empty-note">Grafik için geçerli girdi gerekli.</p>
        )}
      </section>

    </>
  )
}
