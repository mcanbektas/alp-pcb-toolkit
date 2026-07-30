import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import TextField from '../../../components/TextField'
import Segmented from '../../../components/Segmented'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import ReportDialog from '../../../components/ReportDialog'
import SaveToProject from '../../../components/SaveToProject'
import useToolForm from '../../../hooks/useToolForm'
import { statusChip, worstLevel, countAtLevel } from '../../../lib/statusChip'
import useSavedCalculation from '../../../hooks/useSavedCalculation'
import useSavedThickness from '../../../hooks/useSavedThickness'
import { useLang } from '../../../hooks/useLang'
import { commonText } from '../../../data/uiText'
import { fmt, fmtEng, fmtOhm, fmtPct } from '../../../lib/num'
import { METHOD_NOMINAL, METHOD_DERIVED } from '../../../lib/copper'
import CopperSchematic from './schematic'
import {
  INITIAL_FORM, SOURCES, SOURCE_WEIGHT, SOURCE_FINISHED, OZ_ROWS, OZ_CUSTOM,
  compute, buildSweep, recordFrom, formFromRecord,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

const MARK = { ok: '✓', warn: '!', danger: '×' }

export default function CopperConverter() {
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  // Kaydedilmiş hesabı geri yükler (?hesap=<id>) ve ekranı o kayda bağlar;
  // SaveToProject bağlı kayda yeni satır açmak yerine üzerine yazar.
  // `saved` adı bu ekranda bakır kalınlığı kayıtlarına ait — proje kaydının
  // bağı ayrı adla durur.
  const savedCalc = useSavedCalculation({
    toolKey: 'cu-converter', initialForm: INITIAL_FORM, patch,
  })
  const saved = useSavedThickness()
  const { lang } = useLang()

  const text = useMemo(() => getText(lang), [lang])
  const ui = useMemo(() => commonText(lang), [lang])

  // Son kayıt eyleminin ekrandaki tek satırlık sonucu ve listede işaretli kayıt.
  // Yalnızca sunum durumu; hesaba girmez.
  const [notice, setNotice] = useState(null)
  const [activeId, setActiveId] = useState(null)

  const r = useMemo(() => compute(f, text.fieldLabels), [f, text])
  const s = useMemo(() => buildSweep(r), [r])
  const notes = useMemo(() => text.commentary(r), [r, text])

  // Rapor bölümü SVG'siz kurulur; ReportDialog indirme anında canlı DOM'dan
  // (aşağıdaki ref'ler) şematik ve grafiği okuyup satır içine çevirir.
  const reportSection = useMemo(() => buildReportSection({ f, r, s, text }), [f, r, s, text])
  const schematicRef = useRef(null)
  const chartRef = useRef(null)

  const status = useMemo(() => {
    if (!r.ok || notes.length === 0) return null
    const levels = notes.map((n) => n.level)
    const worst = worstLevel(levels)
    return statusChip(worst, countAtLevel(levels, worst), ui)
  }, [r, notes, ui])

  const chartSeries = s ? [{ key: 'rsheet', name: 'R_□', tone: toneClass(0), points: s.points }] : []
  // Tolerans bandı yalnızca tolerans girildiğinde vardır; boşken grafik bugünkü
  // hâliyle çizilir.
  const chartBand = s?.band
    ? { name: text.toleranceTable.bandLabel, tone: toneClass(0), points: s.band }
    : null
  const tol = r.ok ? r.tolerance : null
  const tolText = text.toleranceNote(r)

  // --- Kalınlık kayıtları (spec §4.3) ---
  // Ekran yalnızca çağırır: kayıt zarfını model.js kurar, doğrulama ve saklama
  // lib/thicknessRecords.js + hooks/useSavedThickness.js tarafında.
  const saveName = f.saveName.trim()

  const onSave = () => {
    if (!r.ok) { setNotice({ level: 'warn', text: text.saved.needResult }); return }
    if (saveName === '') { setNotice({ level: 'warn', text: text.saved.needName }); return }
    const res = saved.save(recordFrom(saveName, r))
    setNotice(text.savedNotice('save', res))
    if (!res.error) setActiveId(res.record.id)
  }

  const onRestore = (rec) => {
    // Ad da geri gelir: aynı kaydı düzeltip yeniden kaydetmek üzerine yazar.
    patch({ ...formFromRecord(rec), saveName: rec.name })
    setActiveId(rec.id)
    setNotice(text.savedNotice('restore', { ok: true }))
  }

  const onRemove = (rec) => {
    const res = saved.remove(rec.id)
    setNotice(text.savedNotice('remove', res))
    if (!res.error && activeId === rec.id) setActiveId(null)
  }

  return (
    <>
      <Link className="backlink" to="/kategori/akim-guc-bakir">{text.backlink}</Link>

      <div className="tool-header">
        <h1>{text.title}</h1>
        <p>{text.intro}</p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <CopperSchematic ref={schematicRef} r={r} text={text.schematic} />

          <Segmented
            value={f.source}
            onChange={set('source')}
            options={SOURCES.map((x) => ({ value: x, label: text.sourceLabel[x] }))}
          />

          {f.source === SOURCE_WEIGHT ? (
            <>
              <SelectField
                label={text.fields.ozPick.label}
                value={f.ozPick} onChange={set('ozPick')}
                options={text.ozPickOptions}
                hint={text.fields.ozPick.hint}
              />

              {f.ozPick === OZ_CUSTOM && (
                <NumberField
                  label={text.fields.oz.label}
                  value={f.oz} onChange={set('oz')}
                  units={['oz/ft²']} unit="oz/ft²" onUnit={() => {}}
                  hint={text.fields.oz.hint}
                />
              )}

              <SelectField
                label={text.fields.method.label}
                value={f.method} onChange={set('method')}
                options={text.methodOptions}
                hint={text.fields.method.hint}
              />
            </>
          ) : (
            <>
              {f.source === SOURCE_FINISHED && (
                <NumberField
                  label={text.fields.finished.label}
                  value={f.finished} onChange={set('finished')}
                  units={['µm', 'mm', 'mil', 'inch']} unit={f.finishedu} onUnit={set('finishedu')}
                  hint={text.fields.finished.hint}
                />
              )}

              {/* İç katmanda kaplama yoktur: ölçülen değer folyonun kendisidir,
                  geriye çözülecek bir şey kalmaz ve folyo alanı istenmez. */}
              {(f.source !== SOURCE_FINISHED || f.layer === 'external') && (
                <NumberField
                  label={text.fields.thickness.label}
                  value={f.thickness} onChange={set('thickness')}
                  units={['µm', 'mm', 'mil', 'inch']} unit={f.thicknessu} onUnit={set('thicknessu')}
                  hint={f.source === SOURCE_FINISHED
                    ? text.fields.thickness.hintFinished
                    : text.fields.thickness.hintDirect}
                />
              )}
            </>
          )}

          <SelectField
            label={text.fields.layer.label}
            value={f.layer} onChange={set('layer')}
            options={[
              { value: 'external', label: text.fields.layer.external },
              { value: 'internal', label: text.fields.layer.internal },
            ]}
          />

          {/* Ölçülen bitmiş kalınlık yolunda kaplama girdi değil, sonuçtur;
              alan gizlenir ve çözülen değer sonuç panelinde yazar. */}
          {f.source !== SOURCE_FINISHED && (
            <NumberField
              label={text.fields.plating.label}
              value={f.plating} onChange={set('plating')}
              units={['µm']} unit="µm" onUnit={() => {}}
              hint={text.fields.plating.hint}
            />
          )}

          <NumberField
            label={text.fields.W.label}
            value={f.W} onChange={set('W')}
            units={['mm', 'mil']} unit={f.Wu} onUnit={set('Wu')}
            hint={text.fields.W.hint}
          />

          <NumberField
            label={text.fields.etch.label}
            value={f.etch} onChange={set('etch')}
            units={['%']} unit="%" onUnit={() => {}}
            hint={text.fields.etch.hint}
          />

          <NumberField
            label={text.fields.T.label}
            value={f.T} onChange={set('T')}
            units={['°C']} unit="°C" onUnit={() => {}}
            hint={text.fields.T.hint}
          />

          <h2 className="section">{text.fields.toleranceHeading}</h2>

          <NumberField
            label={text.fields.tolStart.label}
            value={f.tolStart} onChange={set('tolStart')}
            units={['± %']} unit="± %" onUnit={() => {}}
            placeholder={text.fields.tolPlaceholder}
            hint={text.fields.tolStart.hint}
          />

          <NumberField
            label={text.fields.tolPlate.label}
            value={f.tolPlate} onChange={set('tolPlate')}
            units={['± %']} unit="± %" onUnit={() => {}}
            placeholder={text.fields.tolPlaceholder}
            hint={text.fields.tolPlate.hint}
          />

          <NumberField
            label={text.fields.tolEtch.label}
            value={f.tolEtch} onChange={set('tolEtch')}
            units={['± %']} unit="± %" onUnit={() => {}}
            placeholder={text.fields.tolPlaceholder}
            hint={text.fields.tolEtch.hint}
          />

          <h2 className="section">{text.saved.caption}</h2>

          {!saved.available && <p className="empty-note warn">{text.saved.unavailable}</p>}

          <TextField
            label={text.saved.nameLabel}
            value={f.saveName} onChange={set('saveName')}
            placeholder={text.saved.namePlaceholder}
            hint={text.saved.nameHint}
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
            + {text.saved.saveLabel}
          </button>

          {notice && (
            <p className={notice.level === 'warn' ? 'empty-note warn' : 'empty-note'}>
              {notice.text}
            </p>
          )}

          {saved.records.length === 0 ? (
            <p className="empty-note">{text.saved.empty}</p>
          ) : (
            <div className="row-list">
              <div className="row-list-head">
                <span className="idx" />
                <span>{text.saved.headName}</span>
                <span>{text.saved.headSummary}</span>
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
                      aria-label={`${rec.name} — ${text.saved.restoreLabel}`}
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
                    aria-label={`${rec.name} — ${text.saved.removeLabel}`}
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
          <h2>{ui.result}</h2>

          {!r.ok ? (
            r.ambiguous ? (
              <p className="empty-note warn">{ui.thousandsNote(r.ambiguous)}</p>
            ) : (
              <p className="empty-note">{text.reasonText(r.reason)}</p>
            )
          ) : (
            <>
              <div className="big-result">
                <div className="label">{text.bigLabel}</div>
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
                    <td>{text.thicknessTable.head}</td>
                    <td>{text.thicknessTable.headCols}</td>
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
                    <td>{text.thicknessTable.ozNominal}</td>
                    <td>{fmt(r.units.starting.ozNominal, 4)} · {fmt(r.units.finished.ozNominal, 4)}</td>
                  </tr>
                </tbody>
              </table>

              {r.nominal != null && (
                <>
                  <h2 className="section">{text.nominalTable.caption}</h2>
                  <table className="result-table">
                    <tbody>
                      <tr className="mini-head">
                        <td>{text.nominalTable.methodUsed}</td>
                        <td>{text.methodLabel[r.method]}</td>
                      </tr>
                      <tr>
                        <td>{text.methodLabel[METHOD_NOMINAL]}</td>
                        <td>{fmt(r.nominal * 1e6, 4)} µm</td>
                      </tr>
                      <tr>
                        <td>{text.methodLabel[METHOD_DERIVED]}</td>
                        <td>{fmt(r.derived * 1e6, 4)} µm</td>
                      </tr>
                      <tr>
                        <td>{text.nominalTable.difference}</td>
                        <td>{text.pct(fmt(((r.nominal - r.derived) / r.derived) * 100, 3))}</td>
                      </tr>
                      <tr>
                        <td>{text.nominalTable.starting}</td>
                        <td>{fmt(r.units.starting.um, 4)} µm</td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}

              {r.platingSolved && (
                <>
                  <h2 className="section">{text.platingTable.caption}</h2>
                  <table className="result-table">
                    <tbody>
                      <tr className="mini-head">
                        <td>{text.platingTable.plating}</td>
                        <td>
                          {fmt(r.plating * 1e6, 4)} µm{' '}
                          <span className="sub">
                            {r.layer === 'external'
                              ? text.platingTable.subExternal
                              : text.platingTable.subInternal}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>{text.platingTable.finished}</td>
                        <td>{fmt(r.units.finished.um, 4)} µm</td>
                      </tr>
                      <tr>
                        <td>{text.platingTable.starting}</td>
                        <td>{fmt(r.units.starting.um, 4)} µm</td>
                      </tr>
                      <tr>
                        <td>{text.platingTable.share}</td>
                        <td>{text.pct(fmt(r.platingShare * 100, 3))}</td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}

              {r.recommended && (
                <>
                  <h2 className="section">{text.recommendedTable.caption}</h2>
                  <table className="result-table">
                    <tbody>
                      <tr className="mini-head">
                        <td>{fmt(r.recommended.oz, 3)} oz/ft²</td>
                        <td>
                          {r.recommended.outOfRange
                            ? text.recommendedTable.outOfRange
                            : r.recommended.exact
                              ? text.recommendedTable.exact
                              : text.recommendedTable.nearest}
                        </td>
                      </tr>
                      <tr>
                        <td>{text.recommendedTable.stepThickness}</td>
                        <td>{fmt(r.recommended.um, 4)} µm</td>
                      </tr>
                      <tr>
                        <td>{text.recommendedTable.finished}</td>
                        <td>{fmt(r.units.finished.um, 4)} µm</td>
                      </tr>
                      <tr>
                        <td>{text.recommendedTable.difference}</td>
                        <td>{text.pct(fmtPct(r.recommended.deltaPct))}</td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}

              <h2 className="section">{text.ozTable.caption}</h2>
              <table className="result-table">
                <tbody>
                  <tr className="mini-head">
                    <td>{text.ozTable.head}</td>
                    <td>{text.ozTable.headCols}</td>
                  </tr>
                  {OZ_ROWS.map((row) => (
                    <tr key={row.oz}>
                      <td>
                        {fmt(row.oz, 3)} oz/ft²
                        {r.recommended && r.recommended.oz === row.oz && (
                          <span className="sub">{text.ozTable.recommended}</span>
                        )}
                      </td>
                      <td>{fmt(row.um, 4)} µm</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h2 className="section">{text.sectionTable.caption}</h2>
              <table className="result-table">
                <tbody>
                  <tr>
                    <td>{text.sectionTable.rectArea}</td>
                    <td>{fmt(r.rect.area * 1e6, 4)} mm²</td>
                  </tr>
                  <tr>
                    <td>{text.sectionTable.trapArea}</td>
                    <td>
                      {fmt(r.trap.area * 1e6, 4)} mm²{' '}
                      <span className="sub">(−{text.pct(fmt(r.trap.lossPct, 3))})</span>
                    </td>
                  </tr>
                  <tr>
                    <td>{text.sectionTable.widths}</td>
                    <td>{fmtEng(r.trap.Wtop, 'm', 4)} · {fmtEng(r.trap.Wbottom, 'm', 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.sectionTable.sheet(fmt(r.T, 3))}</td>
                    <td>{fmtOhm(r.Rsheet)}/□</td>
                  </tr>
                  <tr>
                    <td>{text.sectionTable.sheetTrap}</td>
                    <td>{fmtOhm(r.RsheetTrap)}/□</td>
                  </tr>
                </tbody>
              </table>

              {tol && tol.error && (
                <>
                  <h2 className="section">{text.toleranceTable.caption}</h2>
                  <p className="empty-note warn">{text.toleranceReason(tol.error)}</p>
                </>
              )}

              {tol && !tol.error && tol.active && (
                <>
                  <h2 className="section">{text.toleranceTable.caption}</h2>
                  <table className="result-table">
                    <tbody>
                      <tr className="mini-head">
                        <td>{text.toleranceTable.head}</td>
                        <td>{text.toleranceTable.headCols(tol.corners.length)}</td>
                      </tr>
                      <tr>
                        <td>{text.toleranceTable.finished}</td>
                        <td>
                          {fmt(tol.finished.min * 1e6, 4)} · {fmt(tol.finished.nom * 1e6, 4)} ·{' '}
                          {fmt(tol.finished.max * 1e6, 4)}{' '}
                          <span className="sub">
                            ({text.pct(fmtPct(tol.finished.minPct))} / {text.pct(fmtPct(tol.finished.maxPct))})
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>{text.toleranceTable.area}</td>
                        <td>
                          {fmt(tol.area.min * 1e6, 4)} · {fmt(tol.area.nom * 1e6, 4)} ·{' '}
                          {fmt(tol.area.max * 1e6, 4)}{' '}
                          <span className="sub">
                            ({text.pct(fmtPct(tol.area.minPct))} / {text.pct(fmtPct(tol.area.maxPct))})
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>{text.toleranceTable.sheet}</td>
                        <td>
                          {fmtOhm(tol.Rsheet.min)}/□ · {fmtOhm(tol.Rsheet.nom)}/□ ·{' '}
                          {fmtOhm(tol.Rsheet.max)}/□{' '}
                          <span className="sub">
                            ({text.pct(fmtPct(tol.Rsheet.minPct))} / {text.pct(fmtPct(tol.Rsheet.maxPct))})
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>{text.toleranceTable.applied}</td>
                        <td>
                          {text.toleranceTable.appliedValue(
                            fmt(tol.tol.starting * 100, 3),
                            fmt(tol.tol.plating * 100, 3),
                            fmt(tol.tol.etch * 100, 3),
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}

              <h2 className="section">{ui.commentary}</h2>
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
              <h2 className="section">{text.saved.caption}</h2>
              <table className="pick-table">
                <thead>
                  <tr>
                    <th>{text.saved.colName}</th>
                    <th>{text.saved.colSource}</th>
                    <th>{text.saved.colLayer}</th>
                    <th>{text.saved.colStarting}</th>
                    <th>{text.saved.colPlating}</th>
                    <th>{text.saved.colFinished}</th>
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
                      <td>{text.sourceLong[rec.source]}</td>
                      <td>{text.layerLabel[rec.layer]}</td>
                      <td>{fmt(rec.starting, 4)}</td>
                      <td>{fmt(rec.plating, 4)}</td>
                      <td>{fmt(rec.finished, 4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="empty-note">{text.saved.tableNote}</p>
            </>
          )}
        </section>

        {/* ---------- Sağ: Teknik detay ---------- */}
        <section className="panel panel-detail">
          <h2>{ui.technicalDetail}</h2>

          <pre className="formula">{text.formula}</pre>

          {r.ok && (
            <ul className="detail-list">
              <li>{text.detail.method(r)}</li>
              <li>{text.detail.thicknessUsed(r)}</li>
              {r.recommended && <li>{text.detail.recommended(r.recommended)}</li>}
              <li>{text.detail.copperOnly}</li>
              {r.etch > 0 && <li>{text.detail.etch(r)}</li>}
              {tolText && <li>{tolText}</li>}
              <li>{text.detail.noRounding}</li>
            </ul>
          )}

          <h2 className="section">{text.validityHeading}</h2>
          <ul className="detail-list">
            {text.validityRange.map((n) => <li key={n}>{n}</li>)}
          </ul>

          <h2 className="section">{ui.sources}</h2>
          <ul className="detail-list">
            {text.sourceNotes.map((n) => <li key={n}>{n}</li>)}
          </ul>

          <h2 className="section">{text.assumptionsHeading}</h2>
          <ul className="detail-list">
            {text.assumptions.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </section>
      </div>

      {/* ---------- Alt: Parametrik grafik ---------- */}
      <section className="panel panel-chart">
        <div className="chart-head">
          <h2>{ui.chart}</h2>
        </div>

        {s ? (
          <>
            <ChartLegend
              items={[
                { label: text.chart.legend, tone: toneClass(0), kind: 'line' },
                ...(chartBand
                  ? [{ label: text.toleranceTable.bandLabel, tone: toneClass(0), faded: true }]
                  : []),
              ]}
            />

            <LineChart
              ref={chartRef}
              xScale="linear"
              xLabel={text.chart.x}
              yLabel={text.chart.y}
              series={chartSeries}
              band={chartBand}
              marker={{ ...s.marker, label: text.chart.marker }}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => fmtEng(v, '', 3)}
              caption={chartBand
                ? `${text.chart.caption} ${text.chart.bandNote}`
                : text.chart.caption}
            />

            <ChartDataTable
              xLabel={text.chart.x}
              series={chartSeries}
              every={5}
              formatX={(v) => `${fmt(v, 3)} oz`}
              formatY={(v) => `${fmtOhm(v)}/□`}
            />
          </>
        ) : (
          <p className="empty-note">{ui.chartNeedsInput}</p>
        )}
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} chartRef={chartRef} />
      <SaveToProject
        toolKey="cu-converter"
        f={f}
        r={r}
        section={reportSection}
        schematicRef={schematicRef}
        chartRef={chartRef}
        saved={savedCalc}
      />
    </>
  )
}
