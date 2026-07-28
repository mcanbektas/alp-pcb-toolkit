import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import TextField from '../../../components/TextField'
import Segmented from '../../../components/Segmented'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import useToolForm from '../../../hooks/useToolForm'
import useSavedThickness from '../../../hooks/useSavedThickness'
import { fmt, fmtEng, fmtOhm, fmtPct, THOUSANDS_MESSAGE } from '../../../lib/num'
import CopperSchematic from './schematic'
import {
  INITIAL_FORM, SOURCES, SOURCE_WEIGHT, SOURCE_FINISHED, OZ_OPTIONS, OZ_ROWS, OZ_CUSTOM,
  compute, buildSweep, recordFrom, formFromRecord,
} from './model'
import {
  SOURCE_LABEL, SOURCE_LONG, LAYER_LABEL, CHART, OZ_PICK_OPTIONS, METHOD_OPTIONS,
  METHOD_LABEL, OZ_TABLE_CAPTION, TOLERANCE_CAPTION, TOLERANCE_BAND_LABEL, SAVED,
  reasonText, commentary, toleranceReason, toleranceNote, savedNotice,
} from './text'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }

export default function CopperConverter() {
  const { f, set, patch } = useToolForm(INITIAL_FORM)
  const saved = useSavedThickness()

  // Son kayıt eyleminin ekrandaki tek satırlık sonucu ve listede işaretli kayıt.
  // Yalnızca sunum durumu; hesaba girmez.
  const [notice, setNotice] = useState(null)
  const [activeId, setActiveId] = useState(null)

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

  const chartSeries = s ? [{ key: 'rsheet', name: 'R_□', tone: toneClass(0), points: s.points }] : []
  // Tolerans bandı yalnızca tolerans girildiğinde vardır; boşken grafik bugünkü
  // hâliyle çizilir.
  const chartBand = s?.band ? { name: TOLERANCE_BAND_LABEL, tone: toneClass(0), points: s.band } : null
  const tol = r.ok ? r.tolerance : null
  const tolText = toleranceNote(r)

  // --- Kalınlık kayıtları (spec §4.3) ---
  // Ekran yalnızca çağırır: kayıt zarfını model.js kurar, doğrulama ve saklama
  // lib/thicknessRecords.js + hooks/useSavedThickness.js tarafında.
  const saveName = f.saveName.trim()

  const onSave = () => {
    if (!r.ok) { setNotice({ level: 'warn', text: SAVED.needResult }); return }
    if (saveName === '') { setNotice({ level: 'warn', text: SAVED.needName }); return }
    const res = saved.save(recordFrom(saveName, r))
    setNotice(savedNotice('save', res))
    if (!res.error) setActiveId(res.record.id)
  }

  const onRestore = (rec) => {
    // Ad da geri gelir: aynı kaydı düzeltip yeniden kaydetmek üzerine yazar.
    patch({ ...formFromRecord(rec), saveName: rec.name })
    setActiveId(rec.id)
    setNotice(savedNotice('restore', { ok: true }))
  }

  const onRemove = (rec) => {
    const res = saved.remove(rec.id)
    setNotice(savedNotice('remove', res))
    if (!res.error && activeId === rec.id) setActiveId(null)
  }

  return (
    <>
      <div className="tool-header">
        <h1>Copper Thickness Converter</h1>
        <p>
          Bakır ağırlığı ile kalınlık arasında çevirir; nominal tablo ile yoğunluktan türetilen
          değeri karşılaştırır, kaplamayla bitmiş kalınlığı ve trapez kesit etkisini gösterir.
          Ölçülen bitmiş kalınlık doğrudan girilebilir — o yolda kaplama geriye çözülür — ve
          nominal ile bitmiş kalınlıklar adlandırılıp bu tarayıcıda saklanabilir.
        </p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>Girdiler</h2>

          <CopperSchematic r={r} />

          <Segmented
            value={f.source}
            onChange={set('source')}
            options={SOURCES.map((x) => ({ value: x, label: SOURCE_LABEL[x] }))}
          />

          {f.source === SOURCE_WEIGHT ? (
            <>
              <SelectField
                label="Bakır ağırlığı"
                value={f.ozPick} onChange={set('ozPick')}
                options={OZ_PICK_OPTIONS}
                hint={`Nominal tablo basamakları: ${OZ_OPTIONS.join(', ')} oz/ft². Ara bir değer için “Özel değer…” seçin.`}
              />

              {f.ozPick === OZ_CUSTOM && (
                <NumberField
                  label="Özel bakır ağırlığı"
                  value={f.oz} onChange={set('oz')}
                  units={['oz/ft²']} unit="oz/ft²" onUnit={() => {}}
                  hint="Tablo dışı ağırlıklar doğrusal nominal kuralla çevrilir: t[µm] = 35 × oz."
                />
              )}

              <SelectField
                label="Dönüşüm yöntemi"
                value={f.method} onChange={set('method')}
                options={METHOD_OPTIONS}
                hint="Varsayılan nominal tablodur; seçim sonuç panelinde ve teknik detayda yazar."
              />
            </>
          ) : (
            <>
              {f.source === SOURCE_FINISHED && (
                <NumberField
                  label="Ölçülen bitmiş kalınlık"
                  value={f.finished} onChange={set('finished')}
                  units={['µm', 'mm', 'mil', 'inch']} unit={f.finishedu} onUnit={set('finishedu')}
                  hint="Kupon ya da kesit ölçümünden gelen bitmiş bakır kalınlığı; türetilmez, olduğu gibi kullanılır."
                />
              )}

              {/* İç katmanda kaplama yoktur: ölçülen değer folyonun kendisidir,
                  geriye çözülecek bir şey kalmaz ve folyo alanı istenmez. */}
              {(f.source !== SOURCE_FINISHED || f.layer === 'external') && (
                <NumberField
                  label="Başlangıç (folyo) kalınlığı"
                  value={f.thickness} onChange={set('thickness')}
                  units={['µm', 'mm', 'mil', 'inch']} unit={f.thicknessu} onUnit={set('thicknessu')}
                  hint={f.source === SOURCE_FINISHED
                    ? 'Sipariş edilen folyo kalınlığı. Kaplama bundan geriye çözülür: kaplama = bitmiş − folyo.'
                    : 'Ağırlık çevrimi yapılmaz; yöntem seçimi yalnızca ağırlıktan çevirirken geçerlidir.'}
                />
              )}
            </>
          )}

          <SelectField
            label="Katman"
            value={f.layer} onChange={set('layer')}
            options={[
              { value: 'external', label: 'Dış katman (kaplama eklenir)' },
              { value: 'internal', label: 'İç katman (kaplama yok)' },
            ]}
          />

          {/* Ölçülen bitmiş kalınlık yolunda kaplama girdi değil, sonuçtur;
              alan gizlenir ve çözülen değer sonuç panelinde yazar. */}
          {f.source !== SOURCE_FINISHED && (
            <NumberField
              label="Kaplama kalınlığı"
              value={f.plating} onChange={set('plating')}
              units={['µm']} unit="µm" onUnit={() => {}}
              hint="Tipik delik kaplaması 20–30 µm; iç katmanda yok sayılır"
            />
          )}

          <NumberField
            label="Yol genişliği"
            value={f.W} onChange={set('W')}
            units={['mm', 'mil']} unit={f.Wu} onUnit={set('Wu')}
            hint="Kesit alanı ve trapez etkisi bu genişlikte hesaplanır"
          />

          <NumberField
            label="Aşındırma oranı"
            value={f.etch} onChange={set('etch')}
            units={['%']} unit="%" onUnit={() => {}}
            hint="W_üst = W_alt · (1 − E). Sıfır girilirse kesit dikdörtgen sayılır"
          />

          <NumberField
            label="Sıcaklık"
            value={f.T} onChange={set('T')}
            units={['°C']} unit="°C" onUnit={() => {}}
            hint="Kare direnci bu sıcaklığa göre düzeltilir"
          />

          <h2 className="section">Üretim toleransı (isteğe bağlı)</h2>

          <NumberField
            label="Folyo kalınlığı toleransı"
            value={f.tolStart} onChange={set('tolStart')}
            units={['± %']} unit="± %" onUnit={() => {}}
            placeholder="boş = tolerans yok"
            hint="Girilen ya da ağırlıktan çevrilen başlangıç kalınlığına uygulanır"
          />

          <NumberField
            label="Kaplama kalınlığı toleransı"
            value={f.tolPlate} onChange={set('tolPlate')}
            units={['± %']} unit="± %" onUnit={() => {}}
            placeholder="boş = tolerans yok"
            hint="İç katmanda kaplama olmadığı için sonucu etkilemez"
          />

          <NumberField
            label="Aşındırma oranı toleransı"
            value={f.tolEtch} onChange={set('tolEtch')}
            units={['± %']} unit="± %" onUnit={() => {}}
            placeholder="boş = tolerans yok"
            hint="Aşındırma oranının kendi değerine göre bağıl sapması; yalnızca kesit alanını oynatır"
          />

          <h2 className="section">{SAVED.caption}</h2>

          {!saved.available && <p className="empty-note warn">{SAVED.unavailable}</p>}

          <TextField
            label={SAVED.nameLabel}
            value={f.saveName} onChange={set('saveName')}
            placeholder={SAVED.namePlaceholder}
            hint={SAVED.nameHint}
          />

          {/* Yalnızca depolama yokken düğme kapanır: o durumun tek çaresi
              tarayıcı ayarıdır. Eksik ad ya da geçersiz sonuçta düğme açık
              kalır ve nedeni tıklayınca yazılır — sessizce kapalı bir düğme
              kullanıcıya hiçbir şey anlatmaz. */}
          <button
            type="button"
            className="row-add"
            onClick={onSave}
            disabled={!saved.available}
          >
            + {SAVED.saveLabel}
          </button>

          {notice && (
            <p className={notice.level === 'warn' ? 'empty-note warn' : 'empty-note'}>
              {notice.text}
            </p>
          )}

          {saved.records.length === 0 ? (
            <p className="empty-note">{SAVED.empty}</p>
          ) : (
            <div className="row-list">
              <div className="row-list-head">
                <span className="idx" />
                <span>{SAVED.headName}</span>
                <span>{SAVED.headSummary}</span>
                <span className="act" />
              </div>

              {saved.records.map((rec, i) => (
                <div className="row-list-item" key={rec.id}>
                  <span className="idx">{i + 1}</span>
                  <span className="cell">
                    <button
                      type="button"
                      className="row-add"
                      onClick={() => onRestore(rec)}
                      aria-label={`${rec.name} — ${SAVED.restoreLabel}`}
                    >
                      {rec.name}
                    </button>
                  </span>
                  <span className="cell">
                    <span className="chip">
                      {fmt(rec.starting, 4)} · {fmt(rec.finished, 4)} µm
                    </span>
                  </span>
                  <button
                    type="button"
                    className="act"
                    onClick={() => onRemove(rec)}
                    aria-label={`${rec.name} — ${SAVED.removeLabel}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
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
                <div className="label">Bitmiş bakır kalınlığı</div>
                <div className="value">{fmt(r.units.finished.um, 4)} µm</div>
                <div className="alt">
                  {fmt(r.units.finished.mil, 4)} mil &nbsp;·&nbsp; {fmt(r.units.finished.mm, 4)} mm
                  &nbsp;·&nbsp; ≈ {fmt(r.units.finished.ozNominal, 3)} oz/ft²
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr className="mini-head">
                    <td>Kalınlık</td>
                    <td>başlangıç · bitmiş</td>
                  </tr>
                  <tr>
                    <td>µm</td>
                    <td>{fmt(r.units.starting.um, 4)} · {fmt(r.units.finished.um, 4)}</td>
                  </tr>
                  <tr>
                    <td>mm</td>
                    <td>{fmt(r.units.starting.mm, 4)} · {fmt(r.units.finished.mm, 4)}</td>
                  </tr>
                  <tr>
                    <td>mil</td>
                    <td>{fmt(r.units.starting.mil, 4)} · {fmt(r.units.finished.mil, 4)}</td>
                  </tr>
                  <tr>
                    <td>inch</td>
                    <td>{fmt(r.units.starting.inch, 4)} · {fmt(r.units.finished.inch, 4)}</td>
                  </tr>
                  <tr>
                    <td>oz/ft² (nominal)</td>
                    <td>{fmt(r.units.starting.ozNominal, 4)} · {fmt(r.units.finished.ozNominal, 4)}</td>
                  </tr>
                </tbody>
              </table>

              {r.nominal != null && (
                <>
                  <h2 className="section">Nominal ve türetilmiş</h2>
                  <table className="result-table">
                    <tbody>
                      <tr className="mini-head">
                        <td>Kullanılan yöntem</td>
                        <td>{METHOD_LABEL[r.method]}</td>
                      </tr>
                      <tr>
                        <td>Endüstri nominal tablosu</td>
                        <td>{fmt(r.nominal * 1e6, 4)} µm</td>
                      </tr>
                      <tr>
                        <td>Bakır yoğunluğundan türetilen</td>
                        <td>{fmt(r.derived * 1e6, 4)} µm</td>
                      </tr>
                      <tr>
                        <td>Fark</td>
                        <td>{fmt(((r.nominal - r.derived) / r.derived) * 100, 3)} %</td>
                      </tr>
                      <tr>
                        <td>Başlangıç kalınlığı</td>
                        <td>{fmt(r.units.starting.um, 4)} µm</td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}

              {r.platingSolved && (
                <>
                  <h2 className="section">Geriye çözülen kaplama</h2>
                  <table className="result-table">
                    <tbody>
                      <tr className="mini-head">
                        <td>Kaplama</td>
                        <td>
                          {fmt(r.plating * 1e6, 4)} µm{' '}
                          <span className="sub">
                            {r.layer === 'external' ? '(bitmiş − folyo)' : '(iç katmanda yok)'}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>Ölçülen bitmiş kalınlık</td>
                        <td>{fmt(r.units.finished.um, 4)} µm</td>
                      </tr>
                      <tr>
                        <td>Başlangıç (folyo) kalınlığı</td>
                        <td>{fmt(r.units.starting.um, 4)} µm</td>
                      </tr>
                      <tr>
                        <td>Kaplamanın kesitteki payı</td>
                        <td>{fmt(r.platingShare * 100, 3)} %</td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}

              {r.recommended && (
                <>
                  <h2 className="section">Üretim için önerilen bakır ağırlığı</h2>
                  <table className="result-table">
                    <tbody>
                      <tr className="mini-head">
                        <td>{fmt(r.recommended.oz, 3)} oz/ft²</td>
                        <td>
                          {r.recommended.outOfRange
                            ? 'tablo aralığının dışı'
                            : r.recommended.exact
                              ? 'bitmiş kalınlığın kendisi'
                              : 'en yakın sipariş basamağı'}
                        </td>
                      </tr>
                      <tr>
                        <td>Basamağın nominal kalınlığı</td>
                        <td>{fmt(r.recommended.um, 4)} µm</td>
                      </tr>
                      <tr>
                        <td>Bitmiş kalınlık</td>
                        <td>{fmt(r.units.finished.um, 4)} µm</td>
                      </tr>
                      <tr>
                        <td>Fark</td>
                        <td>{fmtPct(r.recommended.deltaPct)}</td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}

              <h2 className="section">{OZ_TABLE_CAPTION}</h2>
              <table className="result-table">
                <tbody>
                  <tr className="mini-head">
                    <td>Bakır ağırlığı</td>
                    <td>nominal kalınlık</td>
                  </tr>
                  {OZ_ROWS.map((row) => (
                    <tr key={row.oz}>
                      <td>
                        {fmt(row.oz, 3)} oz/ft²
                        {r.recommended && r.recommended.oz === row.oz && (
                          <span className="sub"> (önerilen)</span>
                        )}
                      </td>
                      <td>{fmt(row.um, 4)} µm</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h2 className="section">Kesit ve direnç</h2>
              <table className="result-table">
                <tbody>
                  <tr>
                    <td>Dikdörtgen kesit alanı</td>
                    <td>{fmt(r.rect.area * 1e6, 4)} mm²</td>
                  </tr>
                  <tr>
                    <td>Trapez kesit alanı</td>
                    <td>
                      {fmt(r.trap.area * 1e6, 4)} mm²{' '}
                      <span className="sub">(−{fmt(r.trap.lossPct, 3)} %)</span>
                    </td>
                  </tr>
                  <tr>
                    <td>Üst / alt genişlik</td>
                    <td>{fmtEng(r.trap.Wtop, 'm', 4)} · {fmtEng(r.trap.Wbottom, 'm', 4)}</td>
                  </tr>
                  <tr>
                    <td>Kare direnci @ {fmt(r.T, 3)} °C</td>
                    <td>{fmtOhm(r.Rsheet)}/□</td>
                  </tr>
                  <tr>
                    <td>Trapez kesitle etkin kare direnci</td>
                    <td>{fmtOhm(r.RsheetTrap)}/□</td>
                  </tr>
                </tbody>
              </table>

              {tol && tol.error && (
                <>
                  <h2 className="section">{TOLERANCE_CAPTION}</h2>
                  <p className="empty-note warn">{toleranceReason(tol.error)}</p>
                </>
              )}

              {tol && !tol.error && tol.active && (
                <>
                  <h2 className="section">{TOLERANCE_CAPTION}</h2>
                  <table className="result-table">
                    <tbody>
                      <tr className="mini-head">
                        <td>Worst-case köşe taraması</td>
                        <td>{tol.corners.length} köşe · min · nominal · maks</td>
                      </tr>
                      <tr>
                        <td>Bitmiş kalınlık (µm)</td>
                        <td>
                          {fmt(tol.finished.min * 1e6, 4)} · {fmt(tol.finished.nom * 1e6, 4)} ·{' '}
                          {fmt(tol.finished.max * 1e6, 4)}{' '}
                          <span className="sub">
                            ({fmtPct(tol.finished.minPct)} / {fmtPct(tol.finished.maxPct)})
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>Kesit alanı (mm²)</td>
                        <td>
                          {fmt(tol.area.min * 1e6, 4)} · {fmt(tol.area.nom * 1e6, 4)} ·{' '}
                          {fmt(tol.area.max * 1e6, 4)}{' '}
                          <span className="sub">
                            ({fmtPct(tol.area.minPct)} / {fmtPct(tol.area.maxPct)})
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>Kare direnci</td>
                        <td>
                          {fmtOhm(tol.Rsheet.min)}/□ · {fmtOhm(tol.Rsheet.nom)}/□ ·{' '}
                          {fmtOhm(tol.Rsheet.max)}/□{' '}
                          <span className="sub">
                            ({fmtPct(tol.Rsheet.minPct)} / {fmtPct(tol.Rsheet.maxPct)})
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>Uygulanan tolerans</td>
                        <td>
                          folyo ±{fmt(tol.tol.starting * 100, 3)} % · kaplama ±
                          {fmt(tol.tol.plating * 100, 3)} % · aşındırma ±{fmt(tol.tol.etch * 100, 3)} %
                        </td>
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

          {/* Kayıt listesi hesabın geçerliliğinden bağımsızdır: girdi eksikken
              de görünür, çünkü geri yüklemek girdiyi düzeltmenin yoludur. */}
          {saved.records.length > 0 && (
            <>
              <h2 className="section">{SAVED.caption}</h2>
              <table className="pick-table">
                <thead>
                  <tr>
                    <th>Ad</th>
                    <th>kaynak</th>
                    <th>katman</th>
                    <th>başlangıç</th>
                    <th>kaplama</th>
                    <th>bitmiş</th>
                  </tr>
                </thead>
                <tbody>
                  {saved.records.map((rec) => (
                    <tr
                      key={rec.id}
                      className={`pick${rec.id === activeId ? ' on' : ''}`}
                      onClick={() => onRestore(rec)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRestore(rec) }
                      }}
                      aria-selected={rec.id === activeId}
                    >
                      <td>{rec.name}</td>
                      <td>{SOURCE_LONG[rec.source]}</td>
                      <td>{LAYER_LABEL[rec.layer]}</td>
                      <td>{fmt(rec.starting, 4)}</td>
                      <td>{fmt(rec.plating, 4)}</td>
                      <td>{fmt(rec.finished, 4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="empty-note">{SAVED.tableNote}</p>
            </>
          )}
        </section>

        {/* ---------- Sağ: Teknik detay ---------- */}
        <section className="panel panel-detail">
          <h2>Teknik detay</h2>

          <pre className="formula">{`Yoğunluktan kalınlık:
  m_A = 0.0283495 kg /
          0.092903 m²
      ≈ 0.30515 kg/m²
  t = m_A / ρ_m
    = 0.30515 / 8960
    ≈ 34.06 µm

Nominal tablo:
  t[µm] ≈ 35 × oz

Birim dönüşümleri:
  t[mm]  = t[µm] / 1000
  t[mil] = t[mm] / 0.0254
  t[µm]  = 25.4 × t[mil]

Kesit:
  Dikdörtgen:
    A = W·t
  Trapez:
    A = t·(W_üst + W_alt)/2
    W_üst = W_alt·(1 − E)

Kare direnci:
  R_□ = ρ(T) / t`}</pre>

          {r.ok && (
            <ul className="detail-list">
              <li>
                Kullanılan yöntem:{' '}
                {r.method
                  ? `${METHOD_LABEL[r.method]} — başlangıç kalınlığı ${fmtEng(r.starting, 'm', 5)} buradan geldi.`
                  : r.platingSolved
                    ? `bitmiş kalınlık ölçümden girildi (${fmtEng(r.finished, 'm', 5)}), ağırlık çevrimi yapılmadı; kaplama ${fmtEng(r.plating, 'm', 4)} olarak geriye çözüldü.`
                    : 'kalınlık doğrudan girildi, ağırlık çevrimi yapılmadı.'}
              </li>
              <li>
                Kullanılan kalınlık: bitmiş {fmtEng(r.finished, 'm', 5)}
                {r.plating > 0 && <> (folyo {fmtEng(r.starting, 'm', 4)} + kaplama {fmtEng(r.plating, 'm', 4)})</>}.
              </li>
              {r.recommended && (
                <li>
                  Üretim için önerilen sipariş basamağı {fmt(r.recommended.oz, 3)} oz/ft²
                  ({fmt(r.recommended.um, 4)} µm); bitmiş kalınlığa göre fark{' '}
                  {fmtPct(r.recommended.deltaPct)}.
                </li>
              )}
              <li>Elektriksel kesit yalnızca bakır geometrisidir; PCB kalınlığı buna eklenmez.</li>
              {r.etch > 0 && (
                <li>Aşındırma oranı %{fmt(r.etch, 3)}; kesit kaybı %{fmt(r.trap.lossPct, 3)}.</li>
              )}
              {tolText && <li>{tolText}</li>}
              <li>Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.</li>
            </ul>
          )}

          <h2 className="section">Geçerlilik aralığı</h2>
          <ul className="detail-list">
            <li>
              Nominal tablo {fmt(OZ_ROWS[0].oz, 3)}–{fmt(OZ_ROWS[OZ_ROWS.length - 1].oz, 3)} oz/ft²
              arasını, yani {fmt(OZ_ROWS[0].um, 4)}–{fmt(OZ_ROWS[OZ_ROWS.length - 1].um, 4)} µm
              aralığını kapsar. Bu aralığın dışı doğrusal kuralla (t[µm] = 35 × oz) uzatılır ve
              sipariş basamağı önerisi uç değere yapışır.
            </li>
            <li>
              Nominal ile yoğunluktan türetilen değer 1 oz/ft²'de 35 µm ile ≈34.06 µm'dir; aradaki
              fark ≈ %2.8. Endüstri nominal tanımları 34.8–35 µm bandında verilir.
            </li>
            <li>
              Aşındırma oranı 0 ≤ E &lt; 100 %. E = 100 % üst genişliği sıfırlar, bu yüzden
              reddedilir. Kaplama ≥ 0 µm; dış katmanda tipik delik kaplaması 20–30 µm.
            </li>
            <li>
              Bakır ağırlığı, kalınlık ve yol genişliği sıfırdan büyük olmalıdır; sıfır ve negatif
              girdi hesaplanmaz.
            </li>
            <li>
              Ölçülen bitmiş kalınlık yolunda kaplama geriye çözülür:
              kaplama = bitmiş − folyo. Bu yüzden ölçüm folyo kalınlığından küçük olamaz —
              negatif kaplama hesaplanmaz. İç katmanda kaplama tanım gereği sıfırdır, ölçülen
              değer doğrudan folyo kalınlığı sayılır ve ayrı bir folyo girdisi istenmez.
            </li>
            <li>
              Tolerans alanları isteğe bağlıdır ve boş bırakılabilir; boşken tolerans taraması hiç
              çalışmaz. Her tolerans %0 ile %100 arasında olmalıdır (100 hariç): %100 folyo
              toleransı kalınlığı sıfırlar ve kare direncini tanımsız yapar. Aşındırma toleransının
              üst ucu da aşındırma oranını %100'e çıkaramaz.
            </li>
            <li>
              Kare direnci 20 °C referanslı doğrusal modelle düzeltilir:
              ρ(T) = 1.724×10⁻⁸ · [1 + 0.00393·(T − 20)] Ω·m. Kaynak doküman bu model için sayısal
              bir sıcaklık üst sınırı vermiyor; oda sıcaklığından uzaklaştıkça doğrusallık bozulur.
            </li>
          </ul>

          <h2 className="section">Kaynak ve tanımlar</h2>
          <ul className="detail-list">
            <li>
              Uzunluk: uluslararası inç tanımı 1 inch = 25.4 mm (tam). Buradan 1 mil = 0.001 inch =
              25.4 µm. Tüm mil/inch dönüşümleri yalnızca bu tanımdan gelir.
            </li>
            <li>
              Kütle ve alan: uluslararası avoirdupois ons 1 oz = 0.0283495231 kg; uluslararası foot
              ile 1 ft² = 0.09290304 m². İkisinden 1 oz/ft² ≈ 0.30515 kg/m².
            </li>
            <li>
              Bakır yoğunluğu ρ_m = 8960 kg/m³ (oda sıcaklığı). Yoğunluktan türetilen kalınlık
              yalnızca bu sabitten çıkar; ölçüm ya da tablo değil, tanım gereği hesaptır.
            </li>
            <li>
              1 oz/ft² ≈ 35 µm eşitliği fizikten değil, endüstri nominal folyo tablosundan gelir.
              Lisanslı bir tablo bu depoya kopyalanmadı; yalnızca kaynak dokümanda verilen altı
              basamak kullanılıyor.
            </li>
            <li>
              Bakır özdirenci ρ₂₀ = 1.724×10⁻⁸ Ω·m ve sıcaklık katsayısı α = 0.00393 1/°C —
              kare direnci ve sıcaklık düzeltmesi bu iki sabite dayanır.
            </li>
          </ul>

          <h2 className="section">Varsayımlar</h2>
          <ul className="detail-list">
            <li>
              Nominal tablo ile yoğunluktan türetilen değer arasındaki fark bilinçlidir; ikisi de
              gösterilir, hesapta hangisinin kullanıldığı yöntem seçicisiyle belirlenir ve sonuç
              panelinde yazar. Varsayılan nominal tablodur.
            </li>
            <li>
              Sipariş basamağı önerisi, bitmiş kalınlığa en yakın nominal ağırlıktır; eşit
              uzaklıkta kalın basamak seçilir. Öneri bir yuvarlamadır, üretici onayı değildir.
            </li>
            <li>
              Grafik ve "oz/ft² (nominal)" satırı her zaman nominal kuralı (35 µm/oz) kullanır;
              yöntem seçimi yalnızca ağırlıktan kalınlığa çevrimi etkiler.
            </li>
            <li>
              Kaplama yalnızca dış katmanlara eklenir ve düzgün kalınlıkta varsayılır. Gerçekte
              kaplama dağılımı panel üzerinde değişir.
            </li>
            <li>
              Aşındırma oranı tek bir sayıyla temsil edilir. Üreticinin gerçek üst-alt genişlik
              verisi varsa o tercih edilmelidir.
            </li>
            <li>
              Tolerans analizi basit worst-case yaklaşımıdır: toleranslı üç giriş — folyo
              kalınlığı, kaplama kalınlığı ve aşındırma oranı — yalnızca uç değerlerine konur ve
              2³ = 8 köşenin hepsi hesaplanır. Sonuçların üçü de her girişte monoton olduğundan
              köşeler gerçek uçları verir. Toleranslar bağımsız ve eşit olasılıklı sayılmaz;
              istatistiksel bir dağılım varsayılmaz, bu yüzden üçlü bir olasılık aralığı değil,
              mutlak sınırdır. Kaynak doküman bu ekran için sayısal bir tolerans değeri vermiyor —
              yüzdeler üreticinin kendi verisinden girilmelidir.
            </li>
            <li>
              Grafikteki tolerans bandı, çalışma noktasında bulunan bağıl kalınlık aralığının eğri
              boyunca sabit kaldığı varsayımıyla çizilir. Gerçekte kaplamanın bitmiş kalınlıktaki
              payı bakır ağırlığıyla değişir; bağlayıcı olan sayı orta paneldeki üçlüdür.
            </li>
            <li>
              Kare direnci DC içindir; yüksek frekansta deri etkisi akımı yüzeye iter ve etkin
              kesiti küçültür.
            </li>
            <li>
              Ölçülen bitmiş kalınlık yolunda kaplama tek bir sayıya indirgenir: ölçüm ile folyo
              arasındaki bütün fark kaplamaya yazılır. Folyonun kendi toleransı, kaplamanın panel
              üzerindeki dağılımı ve ölçüm belirsizliği bu tek sayının içinde toplanır — çözülen
              kaplama bir ölçüm değil, iki sayının farkıdır.
            </li>
            <li>
              Kalınlık kayıtları yalnızca bu tarayıcıda, site verisi içinde tutulur; sunucuya
              gönderilmez, cihazlar arasında taşınmaz ve tarayıcı verisi silinince kaybolur.
              Kayıt zarfı sürüm numarası taşır: format değişirse eski kayıt sessizce yanlış
              okunmaz, hiç yüklenmez. Kayıtlar kanonik olarak µm saklanır; geri yüklerken birim
              seçicileri µm'ye ayarlanır, sayının kendisi değişmez.
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
                { label: 'kare direnci', tone: toneClass(0), kind: 'line' },
                ...(chartBand ? [{ label: TOLERANCE_BAND_LABEL, tone: toneClass(0), faded: true }] : []),
              ]}
            />

            <LineChart
              xScale="linear"
              xLabel={CHART.x}
              yLabel={CHART.y}
              series={chartSeries}
              band={chartBand}
              marker={{ ...s.marker, label: 'seçilen' }}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => fmtEng(v, '', 3)}
              caption={chartBand ? `${CHART.caption} ${CHART.bandNote}` : CHART.caption}
            />

            <ChartDataTable
              xLabel={CHART.x}
              series={chartSeries}
              every={5}
              formatX={(v) => `${fmt(v, 3)} oz`}
              formatY={(v) => `${fmtOhm(v)}/□`}
            />
          </>
        ) : (
          <p className="empty-note">Grafik için geçerli girdi gerekli.</p>
        )}
      </section>

      <Link className="backlink" to="/kategori/akim-guc-bakir">← PCB Akım, Güç ve Bakır</Link>
    </>
  )
}
