import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import TextField from '../../../components/TextField'
import RowList from '../../../components/RowList'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import ReportDialog from '../../../components/ReportDialog'
import SaveToProject from '../../../components/SaveToProject'
import ProfilePanel from '../../../components/ProfilePanel'
import DfmChecks from '../../../components/DfmChecks'
import DfmSummaryBox from '../../../components/DfmSummaryBox'
import useToolForm from '../../../hooks/useToolForm'
import useDfmProfiles from '../../../hooks/useDfmProfiles'
import useSavedStackups from '../../../hooks/useSavedStackups'
import useClipboard, { COPY_DONE, COPY_FAILED } from '../../../hooks/useClipboard'
import { useLang } from '../../../hooks/useLang'
import { commonText } from '../../../data/uiText'
import { dfmText } from '../../../data/dfmText'
import { fmt } from '../../../lib/num'
import {
  summarizeChecks, STATUS_OK, STATUS_WARNING, STATUS_DANGER, STATUS_UNKNOWN,
} from '../../../lib/dfmCheck'
import { buildDfmSummary } from '../../../lib/dfmSummary'
import {
  CHECK_LAYER_COUNT, CHECK_ASPECT_RATIO, CHECK_SYMMETRY, CHECK_COPPER_BALANCE, CHECK_REFERENCES,
} from '../../../lib/stackup'
import StackupSchematic from './schematic'
import {
  INITIAL_FORM, LEN_UNITS, SWEEP_LAYER, SWEEP_TOLERANCE,
  compute, buildSweep, scalarFields, rowFields,
  layersToRecord, recordToRows, buildTransferPayload,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

const MARK = { ok: '✓', warn: '!', danger: '×', unknown: '·' }

// Uzunluklar SI (m) tutulur, ekranda mm yazılır. Yuvarlama yalnızca burada.
const asMm = (v) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : `${fmt(v * 1e3, 4)} mm`)
// Boyutsuz kontroller (katman sayısı, aspect ratio, yüzde) mm ile yazılmaz.
const DIMENSIONLESS = new Set([
  CHECK_LAYER_COUNT, CHECK_ASPECT_RATIO, CHECK_SYMMETRY, CHECK_COPPER_BALANCE, CHECK_REFERENCES,
])
const asNum = (v) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : fmt(v, 4))

export default function StackupPlanner() {
  const [sweep, setSweep] = useState(SWEEP_LAYER)
  const [sweepLayer, setSweepLayer] = useState(4)
  const [selectedSignal, setSelectedSignal] = useState(null)
  const [recordId, setRecordId] = useState('')
  const [notice, setNotice] = useState(null)
  const [paste, setPaste] = useState('')
  const [exported, setExported] = useState('')

  const { f, set, patch } = useToolForm(INITIAL_FORM)
  const { lang } = useLang()

  const text = useMemo(() => getText(lang), [lang])
  const ui = useMemo(() => commonText(lang), [lang])
  const dfm = useMemo(() => dfmText(lang), [lang])

  const fab = useDfmProfiles()
  const records = useSavedStackups()
  const transferClipboard = useClipboard()

  const ctx = useMemo(
    () => ({ limits: fab.limits, hasProfile: fab.hasProfile }),
    [fab.limits, fab.hasProfile],
  )

  const r = useMemo(() => compute(f, ctx, text.fieldLabels), [f, ctx, text])
  const s = useMemo(() => buildSweep(r, sweep, sweepLayer), [r, sweep, sweepLayer])
  const notes = useMemo(() => text.commentary(r, asMm), [r, text])

  const schematicRef = useRef(null)
  const chartRef = useRef(null)

  const checks = r.ok ? r.checks : []
  const summary = useMemo(() => summarizeChecks(checks), [checks])

  const rows = useMemo(() => checks.map((c) => {
    const format = DIMENSIONLESS.has(c.id) ? asNum : asMm
    return {
      id: c.id,
      label: text.checkLabel(c.id),
      status: c.status,
      actual: format(c.actual),
      required: format(c.required),
      margin: c.margin === null ? '—' : format(c.margin),
      source: dfm.sourceLabel(c.source),
      reason: dfm.unknownReason(c.variant),
    }
  }), [checks, text, dfm])

  const status = useMemo(() => {
    if (!r.ok || checks.length === 0) return null
    const worst = summary.worst
    const count = summary[worst]
    if (worst === STATUS_OK) return { cls: 'ok', text: ui.statusOk }
    if (worst === STATUS_WARNING) return { cls: 'warn', text: ui.statusWarn(count) }
    if (worst === STATUS_DANGER) return { cls: 'danger', text: ui.statusDanger(count) }
    return { cls: 'unknown', text: ui.statusUnknown(count) }
  }, [r, checks, summary, ui])

  // Aktarım yükü: seçili sinyal katmanının empedans parametreleri, kopyalanabilir
  // JSON olarak. Mevcut mimariye en az müdahale eden yol.
  const transferJson = useMemo(() => {
    if (!r.ok || selectedSignal === null) return ''
    const payload = buildTransferPayload(r, selectedSignal, f.saveName)
    return payload ? JSON.stringify(payload, null, 2) : ''
  }, [r, selectedSignal, f.saveName])

  const summaryText = useMemo(() => {
    if (!r.ok) return ''
    const inputs = [
      ...scalarFields(text.fieldLabels)
        .filter((field) => f[field.key] !== '' && f[field.key] != null)
        .map((field) => ({
          label: field.label,
          value: f[field.key],
          unit: field.unitKey ? f[field.unitKey] : (field.unit ?? null),
        })),
      ...f.layers.map((row, i) => ({
        label: `${text.layers.rowLabel} ${i + 1} — ${text.layerTypeLabel(row.type)}`,
        value: row.thickness,
        unit: row.thicknessU,
      })),
    ]

    const built = buildDfmSummary({
      labels: dfm.summary,
      tool: text.title,
      profile: fab.active?.name ?? null,
      inputs,
      results: [
        { label: text.table.dielectricTotal, value: asMm(r.results.dielectricTotal) },
        { label: text.table.copperTotal, value: asMm(r.results.copperTotal) },
        { label: text.table.surfaceTotal, value: asMm(r.results.surfaceTotal) },
        { label: text.table.finishedTotal, value: asMm(r.results.finishedTotal) },
        { label: text.table.totalMin, value: asMm(r.results.totalMin) },
        { label: text.table.totalMax, value: asMm(r.results.totalMax) },
        { label: text.table.copperCount, value: String(r.results.copperCount) },
        { label: text.table.symmetryMax, value: fmt(r.results.symmetryMax * 100, 3), unit: '%' },
        {
          label: text.table.copperBalance,
          value: r.results.copperBalance === null ? '—' : fmt(r.results.copperBalance, 3),
          unit: r.results.copperBalance === null ? null : '%',
        },
      ],
      checks: rows,
      assumptions: (r.assumptions ?? []).map((a) => text.assumptionText(a)),
      method: dfm.method.worstCase,
    })
    return built.error ? '' : built.text
  }, [r, f, text, dfm, fab.active, rows])

  const reportSection = useMemo(
    () => buildReportSection({ f, r, s, text, dfm, rows }),
    [f, r, s, text, dfm, rows],
  )

  const signalOptions = r.ok
    ? r.signals.map((sg) => ({
      value: String(sg.index),
      label: sg.name !== '' && sg.name != null
        ? sg.name
        : `${text.signals.layer} ${sg.index + 1}`,
    }))
    : []

  const layerOptions = f.layers.map((row, i) => ({
    value: String(i),
    label: `${i + 1} — ${row.name !== '' ? row.name : text.layerTypeLabel(row.type)}`,
  }))

  const chartSeries = s
    ? (sweep === SWEEP_TOLERANCE
      ? [
        { key: 'min', name: text.chart.seriesMin, tone: toneClass(0), points: s.points },
        { key: 'max', name: text.chart.seriesMax, tone: toneClass(1), points: s.maxPoints },
      ]
      : [{ key: 'nom', name: text.chart.seriesNominal, tone: toneClass(0), points: s.points }])
    : []

  function saveRecord() {
    if (!r.ok) return
    const name = f.saveName.trim()
    if (name === '') {
      setNotice({ level: 'warn', text: text.records.nameRequired })
      return
    }
    const res = records.save(name, layersToRecord(r.engineInput.layers))
    setNotice(res.error
      ? { level: 'warn', text: text.records.failed }
      : { level: 'ok', text: text.records.saved })
  }

  function loadRecord(id) {
    const found = records.get(id)
    if (!found) return
    patch({ layers: recordToRows(found), saveName: found.name })
    setRecordId(id)
    setNotice({ level: 'ok', text: text.records.loaded })
  }

  function runImport() {
    const res = records.importJson(paste)
    if (res.error) {
      setNotice({ level: 'warn', text: text.records.failed })
      return
    }
    setPaste('')
    loadRecord(res.stackup.id)
  }

  function runExport() {
    if (recordId === '') return
    const res = records.exportJson(recordId)
    if (res.error) {
      setNotice({ level: 'warn', text: text.records.failed })
      return
    }
    setExported(res.json)
  }

  return (
    <>
      <Link className="backlink" to="/kategori/uretim-dfm">{text.backlink}</Link>

      <div className="tool-header">
        <h1>{text.title}</h1>
        <p>{text.intro}</p>
      </div>

      {/* ---------- Katman düzenleyici: tam genişlik ---------- */}
      <section className="panel panel-chart">
        <RowList
          label={text.layers.label}
          rows={f.layers}
          onChange={set('layers')}
          min={1}
          max={40}
          addLabel={text.layers.add}
          rowLabel={text.layers.rowLabel}
          hint={text.layers.hint}
          columns={[
            { key: 'type', label: text.layers.columns.type, options: text.layerTypeOptions },
            { key: 'role', label: text.layers.columns.role, options: text.layerRoleOptions },
            { key: 'name', label: text.layers.columns.name, text: true },
            {
              key: 'thickness',
              label: text.layers.columns.thickness,
              unitKey: 'thicknessU',
              units: LEN_UNITS,
            },
            { key: 'toleranceMode', label: text.layers.columns.tolMode, options: text.tolModeOptions },
            { key: 'tolA', label: text.layers.columns.tolA },
            { key: 'tolB', label: text.layers.columns.tolB },
            { key: 'dk', label: text.layers.columns.dk },
            { key: 'coverage', label: text.layers.columns.coverage },
          ]}
        />
      </section>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <StackupSchematic
            ref={schematicRef}
            r={r}
            text={text.schematic}
            fmtLen={asMm}
            selectedSignal={selectedSignal}
          />

          <NumberField
            label={text.fields.drillDiameter.label}
            value={f.drillDiameter} onChange={set('drillDiameter')}
            units={LEN_UNITS} unit={f.drillDiameterU} onUnit={set('drillDiameterU')}
            hint={text.fields.drillDiameter.hint}
          />
          <NumberField
            label={text.fields.symmetryLimit.label}
            value={f.symmetryLimit} onChange={set('symmetryLimit')}
            units={['%']} unit="%" onUnit={() => {}}
            hint={text.fields.symmetryLimit.hint}
          />
          <NumberField
            label={text.fields.copperBalanceLimit.label}
            value={f.copperBalanceLimit} onChange={set('copperBalanceLimit')}
            units={['%']} unit="%" onUnit={() => {}}
            hint={text.fields.copperBalanceLimit.hint}
          />
          <NumberField
            label={dfm.warnPercent.label}
            value={f.warnPercent} onChange={set('warnPercent')}
            units={['%']} unit="%" onUnit={() => {}}
            hint={dfm.warnPercent.hint}
          />

          <ProfilePanel
            profiles={fab.profiles}
            active={fab.active}
            activeId={fab.activeId}
            available={fab.available}
            onSelect={fab.selectActive}
            onImport={fab.importJson}
            onRemove={fab.remove}
            onExport={fab.exportJson}
          />

          {/* ---------- Kayıtlar ---------- */}
          <h2 className="section">{text.records.title}</h2>

          <TextField
            label={text.fields.saveName.label}
            value={f.saveName}
            onChange={set('saveName')}
            autoCapitalize="none"
          />

          <SelectField
            label={text.records.select}
            value={recordId}
            onChange={(id) => (id === '' ? setRecordId('') : loadRecord(id))}
            options={[
              { value: '', label: text.records.none },
              ...records.stackups.map((rec) => ({ value: rec.id, label: rec.name })),
            ]}
          />

          <div className="report-actions">
            <button type="button" className="row-add" onClick={saveRecord} disabled={!r.ok}>
              {text.records.save}
            </button>
            <button
              type="button"
              className="row-add"
              onClick={() => { records.remove(recordId); setRecordId('') }}
              disabled={recordId === ''}
            >
              {text.records.remove}
            </button>
            <button type="button" className="row-add" onClick={runExport} disabled={recordId === ''}>
              {text.records.exportButton}
            </button>
          </div>

          <label className="field">
            <span className="field-label">{text.records.importPaste}</span>
            <textarea
              className="select-only"
              rows={3}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
            />
          </label>
          <div className="report-actions">
            <button
              type="button"
              className="row-add"
              onClick={runImport}
              disabled={paste.trim() === ''}
            >
              {text.records.importButton}
            </button>
          </div>

          {exported !== '' && (
            <label className="field">
              <span className="field-label">{text.records.exportButton}</span>
              <textarea className="select-only" rows={6} value={exported} readOnly />
            </label>
          )}

          {notice && (
            <p className={`empty-note ${notice.level === 'ok' ? '' : 'warn'}`}>{notice.text}</p>
          )}
          {!records.available && (
            <p className="empty-note warn">{text.records.storageUnavailable}</p>
          )}
        </section>

        {/* ---------- Orta: Ana sonuç ---------- */}
        <section className="panel">
          <h2>{ui.result}</h2>

          {!r.ok ? (
            r.ambiguous ? (
              <p className="empty-note warn">{ui.thousandsNote(r.ambiguous)}</p>
            ) : (
              <p className="empty-note">{text.reasonText(r.reason, r.invalid, r.code, r.index)}</p>
            )
          ) : (
            <>
              <div className="big-result">
                <div className="label">{text.bigResult.label}</div>
                <div className="value">{asMm(r.results.finishedTotal)}</div>
                <div className="alt">
                  {text.bigResult.range} {asMm(r.results.totalMin)} … {asMm(r.results.totalMax)}
                  &nbsp;·&nbsp;
                  {r.results.copperCount} {text.bigResult.layers}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr><td>{text.table.dielectricTotal}</td><td>{asMm(r.results.dielectricTotal)}</td></tr>
                  <tr><td>{text.table.copperTotal}</td><td>{asMm(r.results.copperTotal)}</td></tr>
                  <tr><td>{text.table.surfaceTotal}</td><td>{asMm(r.results.surfaceTotal)}</td></tr>
                  <tr><td>{text.table.finishedTotal}</td><td>{asMm(r.results.finishedTotal)}</td></tr>
                  <tr><td>{text.table.totalMin}</td><td>{asMm(r.results.totalMin)}</td></tr>
                  <tr><td>{text.table.totalNominal}</td><td>{asMm(r.results.totalNominal)}</td></tr>
                  <tr><td>{text.table.totalMax}</td><td>{asMm(r.results.totalMax)}</td></tr>
                  <tr><td>{text.table.copperCount}</td><td>{r.results.copperCount}</td></tr>
                  <tr><td>{text.table.layerCount}</td><td>{r.results.layerCount}</td></tr>
                  <tr>
                    <td>{text.table.symmetryMax}</td>
                    <td>{ui.pct(fmt(r.results.symmetryMax * 100, 3))}</td>
                  </tr>
                  <tr>
                    <td>{text.table.symmetryWeighted}</td>
                    <td>{ui.pct(fmt(r.results.symmetryWeighted * 100, 3))}</td>
                  </tr>
                  <tr>
                    <td>{text.table.copperBalance}</td>
                    <td>
                      {r.results.copperBalance === null
                        ? text.table.notEntered
                        : ui.pct(fmt(r.results.copperBalance, 3))}
                    </td>
                  </tr>
                  <tr>
                    <td>{text.table.achievableAspect}</td>
                    <td>{asNum(r.results.achievableAspect)}</td>
                  </tr>
                </tbody>
              </table>

              <h2 className="section">{text.signals.title}</h2>
              <table className="result-table">
                <tbody>
                  {r.signals.map((sg) => (
                    <tr key={sg.index}>
                      <td>
                        {sg.name !== '' && sg.name != null ? sg.name : `${text.signals.layer} ${sg.index + 1}`}
                        <span className="sub-line">
                          {sg.outer ? text.signals.outer : text.signals.inner}
                          {' · '}
                          {text.signals.copperThickness} {asMm(sg.thickness)}
                        </span>
                      </td>
                      <td>
                        {!sg.hasReference ? text.signals.none : (
                          sg.outer
                            ? `${text.signals.H} ${asMm(sg.H)}`
                            : `${text.signals.H1} ${asMm(sg.H1)} · ${text.signals.H2} ${asMm(sg.H2)}`
                        )}
                        <span className="sub-line">
                          {text.signals.dk}{' '}
                          {sg.dkLower !== null ? fmt(sg.dkLower, 3) : (sg.dkUpper !== null ? fmt(sg.dkUpper, 3) : '—')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h2 className="section">{dfm.checks.title}</h2>
              <DfmChecks rows={rows} />

              {!fab.hasProfile && <p className="empty-note warn">{dfm.noProfileNote}</p>}
              {fab.hasProfile && <p className="method-note">{dfm.fabOnlyNote}</p>}

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
        </section>

        {/* ---------- Sağ: Teknik detay ---------- */}
        <section className="panel panel-detail">
          <h2>{ui.technicalDetail}</h2>

          <pre className="formula">{text.formula.body}</pre>

          <ul className="detail-list">
            <li>{text.detail.twoTotals}</li>
            <li>{text.detail.hNotTotal}</li>
            <li>{text.detail.interveningCopper}</li>
            <li>{text.detail.striplineTwoDistances}</li>
            <li>{text.detail.dkApproximate}</li>
            <li>{text.detail.noRounding}</li>
            {r.ok && (r.assumptions ?? []).map((a) => (
              <li key={a}>{text.assumptionText(a)}</li>
            ))}
          </ul>

          <h2 className="section">{ui.validity}</h2>
          <ul className="detail-list">
            {text.validity.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>

          <h2 className="section">{text.transfer.title}</h2>
          {signalOptions.length === 0 ? (
            <p className="empty-note">{text.transfer.none}</p>
          ) : (
            <>
              <SelectField
                label={text.transfer.selectLabel}
                value={selectedSignal === null ? '' : String(selectedSignal)}
                onChange={(v) => setSelectedSignal(v === '' ? null : Number(v))}
                options={[{ value: '', label: text.records.none }, ...signalOptions]}
              />
              <p className="field-hint">{text.transfer.hint}</p>
              {transferJson !== '' && (
                <>
                  <div className="report-actions">
                    <button
                      type="button"
                      className="row-add"
                      onClick={() => transferClipboard.copy(transferJson)}
                    >
                      {transferClipboard.state === COPY_DONE
                        ? dfm.profile.copied
                        : dfm.profile.copyButton}
                    </button>
                  </div>
                  {transferClipboard.state === COPY_FAILED && (
                    <p className="empty-note warn">{dfm.profile.copyFailed}</p>
                  )}
                  <pre className="formula summary-box">{transferJson}</pre>
                </>
              )}
            </>
          )}
        </section>
      </div>

      {/* ---------- Alt: Parametrik grafik ---------- */}
      <section className="panel panel-chart">
        <div className="chart-head">
          <h2>{ui.chart}</h2>
        </div>

        <SelectField
          label={text.chart.sweepLabel}
          value={sweep}
          onChange={setSweep}
          options={[
            { value: SWEEP_LAYER, label: text.chart.layer },
            { value: SWEEP_TOLERANCE, label: text.chart.tolerance },
          ]}
        />

        {sweep === SWEEP_LAYER && (
          <SelectField
            label={text.chart.layerSelect}
            value={String(sweepLayer)}
            onChange={(v) => setSweepLayer(Number(v))}
            options={layerOptions}
          />
        )}

        {s ? (
          <>
            <ChartLegend
              items={chartSeries.map((series, i) => ({
                label: series.name, tone: toneClass(i), kind: 'line',
              }))}
            />

            <LineChart
              ref={chartRef}
              xScale="linear"
              xLabel={sweep === SWEEP_TOLERANCE ? text.chart.xTolerance : text.chart.xLayer}
              yLabel={text.chart.yTotal}
              series={chartSeries}
              marker={s.marker ?? undefined}
              formatX={(v) => (sweep === SWEEP_TOLERANCE ? fmt(v, 3) : fmt(v * 1e3, 3))}
              formatY={(v) => fmt(v * 1e3, 4)}
              caption={sweep === SWEEP_TOLERANCE ? text.chart.captionTolerance : text.chart.captionLayer}
            />

            <ChartDataTable
              xLabel={sweep === SWEEP_TOLERANCE ? text.chart.xTolerance : text.chart.xLayer}
              series={chartSeries}
              every={4}
              formatX={(v) => (sweep === SWEEP_TOLERANCE ? `${fmt(v, 3)} %` : `${fmt(v * 1e3, 3)} mm`)}
              formatY={(v) => `${fmt(v * 1e3, 4)} mm`}
            />
          </>
        ) : (
          <p className="empty-note">{ui.chartNeedsInput}</p>
        )}
      </section>

      <section className="panel panel-chart">
        <DfmSummaryBox text={summaryText} />
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} chartRef={chartRef} />
      <SaveToProject
        toolKey="stackup-planner"
        f={f}
        r={r}
        section={reportSection}
        schematicRef={schematicRef}
        chartRef={chartRef}
      />
    </>
  )
}
