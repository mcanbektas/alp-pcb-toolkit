import { useMemo, useRef, useState } from 'react'
import LangLink from '../../../components/LangLink'
import NumberField from '../../../components/NumberField'
import Segmented from '../../../components/Segmented'
import ToolHeader from '../../../components/ToolHeader'
import ResultPanel from '../../../components/ResultPanel'
import Commentary from '../../../components/Commentary'
import DfmChecks from '../../../components/DfmChecks'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import ReportDialog from '../../../components/ReportDialog'
import SaveToProject from '../../../components/SaveToProject'
import useToolForm from '../../../hooks/useToolForm'
import useSavedCalculation from '../../../hooks/useSavedCalculation'
import { useLang } from '../../../hooks/useLang'
import { commonText } from '../../../data/uiText'
import { dfmText } from '../../../data/dfmText'
import { statusChip, worstLevel, countAtLevel } from '../../../lib/statusChip'
import { fmt, fmtEng } from '../../../lib/num'
import FlexBendSchematic from './schematic'
import {
  INITIAL_FORM,
  FLEX_DOUBLE, FLEX_MULTI, FLEX_SINGLE, FLEX_RIGID,
  BEND_STATIC, BEND_DYNAMIC,
  EPS_SOURCE_VENDOR, EPS_SOURCE_ASSUMPTION,
  SWEEP_STRAIN, SWEEP_THICKNESS, SWEEP_TEMPERATURE, SWEEP_VENDOR_FACTOR, SWEEP_PARAMS,
  LEN_UNITS, CURRENT_UNITS,
  compute, buildSweep, vendorProfileHint,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

// Eksen tikleri dar; ön ek boşluksuz yazılır (1k, 10k, 1M) — VoltageDivider'daki
// aynı desen. Sıcaklık (°C) ve K_b (boyutsuz) SI ön eki almaz: 1.08 gibi bir
// değer 1'in az altına düşerse fmtEng bunu yanlışlıkla "m" (mili) öneki olarak
// okur, oysa bu iki eksen zaten SI ölçekli bir büyüklük değildir.
const axisEng = (v) => fmtEng(v, '', 3).replace(' ', '')
const axisPlain = (v) => fmt(v, 3)
// A_Cu m² döner; fmtEng DOĞRUSAL (uzunluk/gerilim gibi) büyüklükler içindir —
// alanı da aynı basamaklı SI önekiyle ölçeklemeye kalkarsa (µm² yerine mm²
// gerekirken) boyutsal olarak YANLIŞ sonuç verir. Bu yüzden alan burada elle
// mm²'ye çevrilir (ClearanceCreepagePadstack'teki yerel `asMm` ile aynı gerekçe).
const fmtArea = (x) => (Number.isFinite(x) ? `${fmt(x * 1e6, 4)} mm²` : '—')

export default function FlexPcbBendTrace() {
  const [sweepParam, setSweepParam] = useState(SWEEP_STRAIN)
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  // Kaydedilmiş hesabı geri yükler (?hesap=<id>) ve ekranı o kayda bağlar;
  // SaveToProject bağlı kayda yeni satır açmak yerine üzerine yazar.
  const saved = useSavedCalculation({
    toolKey: 'flex-pcb-bend-trace', initialForm: INITIAL_FORM, patch,
  })
  const { lang } = useLang()

  const text = useMemo(() => getText(lang), [lang])
  const ui = useMemo(() => commonText(lang), [lang])
  const dfm = useMemo(() => dfmText(lang), [lang])

  const r = useMemo(() => compute(f, text.fieldLabels), [f, text])
  const notes = useMemo(() => text.commentary(r, dfm), [r, text, dfm])
  const s = useMemo(() => buildSweep(r, sweepParam), [r, sweepParam])

  // Rapor bölümü SVG'siz kurulur; ReportDialog indirme anında canlı DOM'dan
  // (aşağıdaki ref'ler) şematik ve grafiği okuyup satır içine çevirir.
  const reportSection = useMemo(
    () => buildReportSection({ f, r, s, text, dfm }),
    [f, r, s, text, dfm],
  )
  const schematicRef = useRef(null)
  const chartRef = useRef(null)

  // REV2 §15.9'un on kontrolünden yalnız üçü (via/pad/stiffener mesafesi)
  // sayısaldır ve flexPcb.js → bendClearanceChecks/checkLimit ile kurulmuştur
  // (model.js). Kalan yedisi bilinçli olarak motora bağlanmadı — bkz.
  // text.checksNote ve validity listesi.
  const checks = useMemo(
    () => (r.ok ? [r.clearance.via, r.clearance.pad, r.clearance.stiffener] : []),
    [r],
  )

  const checkRows = useMemo(() => checks.map((c) => ({
    id: c.id,
    label: text.checkLabel(c.id),
    status: c.status,
    actual: c.actual === null ? '—' : fmtEng(c.actual, 'm', 4),
    required: c.required === null ? '—' : fmtEng(c.required, 'm', 4),
    margin: c.margin === null ? '—' : fmtEng(c.margin, 'm', 4),
    // bendClearanceChecks (flexPcb.js) checkLimit'i `source` VERMEDEN çağırır
    // (motora dokunulmadı, bkz. model.js notu) — bu üç kontrolün "kaynağı" dört
    // DFM ekranındaki üretici/karar profili değil, doğrudan kullanıcının
    // girdiği mesafe alanlarıdır; sabit kendi etiketimiz bu yüzden doğrudur.
    source: text.clearanceSourceLabel,
    reason: dfm.unknownReason(c.variant),
  })), [checks, text, dfm])

  // Durum çipi hem mühendislik yorumunun (notes) hem üç mesafe kontrolünün
  // (checks) en kötü seviyesini birlikte yansıtır — ikisi de aynı worstLevel/
  // countAtLevel/statusChip boru hattından geçer (statusChip.js'in 'warn'/
  // 'warning' köprüsü). checkLimit STATUS_WARNING='warning' döner; kendi
  // yorumumuz 'warn' yazıyor — ikisi aynı rütbede olduğu için sayaç şaşırmasın
  // diye burada TEK bir yazıma indirgenir.
  const status = useMemo(() => {
    if (!r.ok) return null
    const levels = [
      ...notes.map((n) => n.level),
      ...checks.map((c) => (c.status === 'warning' ? 'warn' : c.status)),
    ]
    if (levels.length === 0) return null
    const worst = worstLevel(levels)
    return statusChip(worst, countAtLevel(levels, worst), ui)
  }, [r, notes, checks, ui])

  const kbHint = text.fields.Kb.hintFor(vendorProfileHint(f.flexType, f.bendMode))

  const chartSeries = !s ? [] : sweepParam === SWEEP_THICKNESS
    ? [
      ...(s.hasVendor ? [{ key: 'vendor', name: text.seriesVendor, tone: toneClass(0), points: s.points }] : []),
      ...(s.hasStrain ? [{ key: 'strain', name: text.seriesStrain, tone: toneClass(1), points: s.pointsStrain }] : []),
    ]
    : [{ key: sweepParam, name: text.sweepLabel[sweepParam], tone: toneClass(0), points: s.points }]

  const formatSweepX = sweepParam === SWEEP_TEMPERATURE || sweepParam === SWEEP_VENDOR_FACTOR
    ? axisPlain
    : axisEng

  return (
    <>
      <LangLink className="backlink" to="/kategori/uretim-dfm">{text.backlink}</LangLink>

      <ToolHeader title={text.title} intro={text.intro} />

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <FlexBendSchematic ref={schematicRef} r={r} text={text.schematic} />

          <Segmented
            label={text.fields.flexType.label}
            value={f.flexType}
            onChange={set('flexType')}
            options={[
              { value: FLEX_DOUBLE, label: text.fields.flexDouble },
              { value: FLEX_MULTI, label: text.fields.flexMulti },
              { value: FLEX_SINGLE, label: text.fields.flexSingle },
              { value: FLEX_RIGID, label: text.fields.flexRigid },
            ]}
          />
          <Segmented
            label={text.fields.bendMode.label}
            value={f.bendMode}
            onChange={set('bendMode')}
            options={[
              { value: BEND_STATIC, label: text.fields.bendStatic },
              { value: BEND_DYNAMIC, label: text.fields.bendDynamic },
            ]}
          />

          <NumberField
            label={text.fields.tTotal.label}
            value={f.tTotal} onChange={set('tTotal')}
            units={LEN_UNITS} unit={f.tTotalu} onUnit={set('tTotalu')}
          />
          <NumberField
            label={text.fields.R.label}
            value={f.R} onChange={set('R')}
            units={LEN_UNITS} unit={f.Ru} onUnit={set('Ru')}
          />
          <NumberField
            label={text.fields.thetaDeg.label}
            value={f.thetaDeg} onChange={set('thetaDeg')}
            units={['°']} unit="°" onUnit={() => {}}
            hint={text.fields.thetaDeg.hint}
          />
          <NumberField
            label={text.fields.y.label}
            value={f.y} onChange={set('y')}
            units={LEN_UNITS} unit={f.yu} onUnit={set('yu')}
            hint={text.fields.y.hint}
          />

          <NumberField
            label={text.fields.epsilonAllow.label}
            value={f.epsilonAllow} onChange={set('epsilonAllow')}
            units={['%']} unit="%" onUnit={() => {}}
            hint={text.fields.epsilonAllow.hint}
          />
          <Segmented
            label={text.fields.epsilonAllowSource.label}
            value={f.epsilonAllowSource}
            onChange={set('epsilonAllowSource')}
            options={[
              { value: EPS_SOURCE_VENDOR, label: text.fields.epsSourceVendor },
              { value: EPS_SOURCE_ASSUMPTION, label: text.fields.epsSourceAssumption },
            ]}
          />
          <NumberField
            label={text.fields.Kb.label}
            value={f.Kb} onChange={set('Kb')}
            units={['']} unit="" onUnit={() => {}}
            hint={kbHint}
          />

          <NumberField
            label={text.fields.l.label}
            value={f.l} onChange={set('l')}
            units={LEN_UNITS} unit={f.lu} onUnit={set('lu')}
          />
          <NumberField
            label={text.fields.w.label}
            value={f.w} onChange={set('w')}
            units={LEN_UNITS} unit={f.wu} onUnit={set('wu')}
          />
          <NumberField
            label={text.fields.t.label}
            value={f.t} onChange={set('t')}
            units={LEN_UNITS} unit={f.tu} onUnit={set('tu')}
          />
          <NumberField
            label={text.fields.n.label}
            value={f.n} onChange={set('n')}
            units={[text.countUnit]} unit={text.countUnit} onUnit={() => {}}
          />
          <NumberField
            label={text.fields.T.label}
            value={f.T} onChange={set('T')}
            units={['°C']} unit="°C" onUnit={() => {}}
          />
          <NumberField
            label={text.fields.current.label}
            value={f.current} onChange={set('current')}
            units={CURRENT_UNITS} unit={f.currentu} onUnit={set('currentu')}
          />

          <NumberField
            label={text.fields.viaDistance.label}
            value={f.viaDistance} onChange={set('viaDistance')}
            units={LEN_UNITS} unit={f.viaDistanceu} onUnit={set('viaDistanceu')}
          />
          <NumberField
            label={text.fields.viaMinDistance.label}
            value={f.viaMinDistance} onChange={set('viaMinDistance')}
            units={LEN_UNITS} unit={f.viaMinDistanceu} onUnit={set('viaMinDistanceu')}
          />
          <NumberField
            label={text.fields.padDistance.label}
            value={f.padDistance} onChange={set('padDistance')}
            units={LEN_UNITS} unit={f.padDistanceu} onUnit={set('padDistanceu')}
          />
          <NumberField
            label={text.fields.padMinDistance.label}
            value={f.padMinDistance} onChange={set('padMinDistance')}
            units={LEN_UNITS} unit={f.padMinDistanceu} onUnit={set('padMinDistanceu')}
          />
          <NumberField
            label={text.fields.stiffenerDistance.label}
            value={f.stiffenerDistance} onChange={set('stiffenerDistance')}
            units={LEN_UNITS} unit={f.stiffenerDistanceu} onUnit={set('stiffenerDistanceu')}
          />
          <NumberField
            label={text.fields.stiffenerMinDistance.label}
            value={f.stiffenerMinDistance} onChange={set('stiffenerMinDistance')}
            units={LEN_UNITS} unit={f.stiffenerMinDistanceu} onUnit={set('stiffenerMinDistanceu')}
          />
          <NumberField
            label={text.fields.warnPercent.label}
            value={f.warnPercent} onChange={set('warnPercent')}
            units={['%']} unit="%" onUnit={() => {}}
            hint={text.fields.warnPercent.hint}
          />

          {f.bendMode === BEND_DYNAMIC && (
            <>
              <NumberField
                label={text.fields.cycleA.label}
                value={f.cycleA} onChange={set('cycleA')}
                units={['']} unit="" onUnit={() => {}}
              />
              <NumberField
                label={text.fields.cycleB.label}
                value={f.cycleB} onChange={set('cycleB')}
                units={['']} unit="" onUnit={() => {}}
              />
              <NumberField
                label={text.fields.targetCycles.label}
                value={f.targetCycles} onChange={set('targetCycles')}
                units={['']} unit="" onUnit={() => {}}
              />
            </>
          )}
        </section>

        {/* ---------- Orta: Ana sonuç ---------- */}
        {/* İç `r.ok &&` kapısı gerekli: children JSX'i ResultPanel çizmese de
            burada kurulur — bkz. VoltageDivider'daki aynı not. */}
        <ResultPanel r={r} reason={text.reasonText}>
          {r.ok && (
            <>
              <div className="big-result">
                <div className="label">{text.bigResultLabel}</div>
                <div className="value">{text.pct(fmt(r.strainPercent, 3))}</div>
                <div className="alt">
                  R = {fmtEng(r.R, 'm', 3)}
                  {r.vendorMinRadius !== null && (
                    <> &nbsp;·&nbsp; {text.table.vendorMinRadius}: {fmtEng(r.vendorMinRadius, 'm', 3)}</>
                  )}
                  {r.strainMinRadius !== null && (
                    <> &nbsp;·&nbsp; {text.table.strainMinRadius}: {fmtEng(r.strainMinRadius, 'm', 3)}</>
                  )}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  {r.vendorMinRadius !== null && (
                    <tr><td>{text.table.vendorMinRadius}</td><td>{fmtEng(r.vendorMinRadius, 'm', 4)}</td></tr>
                  )}
                  {r.strainMinRadius !== null && (
                    <tr><td>{text.table.strainMinRadius}</td><td>{fmtEng(r.strainMinRadius, 'm', 4)}</td></tr>
                  )}
                  <tr><td>{text.table.bendRadius}</td><td>{fmtEng(r.bendRadius, 'm', 4)}</td></tr>
                  <tr><td>{text.table.strain}</td><td>{text.pct(fmt(r.strainPercent, 4))}</td></tr>
                  {r.arcLength !== null && (
                    <tr><td>{text.table.arcLength}</td><td>{fmtEng(r.arcLength, 'm', 4)}</td></tr>
                  )}
                  {r.surfaceLengths !== null && (
                    <>
                      <tr><td>{text.table.outerLength}</td><td>{fmtEng(r.surfaceLengths.outer, 'm', 4)}</td></tr>
                      <tr><td>{text.table.innerLength}</td><td>{fmtEng(r.surfaceLengths.inner, 'm', 4)}</td></tr>
                    </>
                  )}
                  {r.elongation !== null && (
                    <tr><td>{text.table.elongation}</td><td>{fmtEng(r.elongation, 'm', 4)}</td></tr>
                  )}
                  {r.copperArea !== null && (
                    <tr><td>{text.table.copperArea}</td><td>{fmtArea(r.copperArea)}</td></tr>
                  )}
                  {r.traceResistanceSingle !== null && (
                    <tr><td>{text.table.traceResistanceSingle}</td><td>{fmtEng(r.traceResistanceSingle, 'Ω', 4)}</td></tr>
                  )}
                  {r.traceResistance !== null && (
                    <tr><td>{text.table.traceResistance(r.n)}</td><td>{fmtEng(r.traceResistance, 'Ω', 4)}</td></tr>
                  )}
                  {r.voltageDrop !== null && (
                    <tr><td>{text.table.voltageDrop}</td><td>{fmtEng(r.voltageDrop, 'V', 4)}</td></tr>
                  )}
                  {r.powerLoss !== null && (
                    <tr><td>{text.table.powerLoss}</td><td>{fmtEng(r.powerLoss, 'W', 4)}</td></tr>
                  )}
                  {r.cycleLife !== null && (
                    <tr><td>{text.table.cycleLife}</td><td>{fmt(r.cycleLife, 4)}</td></tr>
                  )}
                </tbody>
              </table>

              <h2 className="section">{text.checksHeading}</h2>
              <DfmChecks rows={checkRows} />
              <p className="method-note">{text.checksNote}</p>

              <Commentary items={notes} />
            </>
          )}
        </ResultPanel>

        {/* ---------- Sağ: Teknik detay ---------- */}
        <section className="panel panel-detail">
          <h2>{ui.technicalDetail}</h2>

          <pre className="formula">{text.formula}</pre>

          {r.ok && (
            <ul className="detail-list">
              <li>{r.y !== null ? text.detail.neutralAxisUsed(r.y) : text.detail.symmetricUsed}</li>
              <li>{text.detail.noRounding}</li>
            </ul>
          )}

          <h2 className="section">{ui.validity}</h2>
          <ul className="detail-list">
            {text.validity.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </section>
      </div>

      {/* ---------- Alt: Parametrik grafik ---------- */}
      <section className="panel panel-chart">
        <div className="chart-head">
          <h2>{ui.chart}</h2>
          <Segmented
            label={text.sweepGroup}
            value={sweepParam}
            onChange={setSweepParam}
            options={SWEEP_PARAMS.map((p) => ({ value: p, label: text.sweepLabel[p] }))}
          />
        </div>

        {s ? (
          <>
            <ChartLegend
              items={chartSeries.map((series) => ({ label: series.name, tone: series.tone, kind: 'line' }))}
            />

            <LineChart
              ref={chartRef}
              // R/t_total/tel genişliği/K_b tümü çok-dekatlı taranır (model.js
              // → logspace); yalnız sıcaklık mutlak-dar bir aralık olduğu için
              // doğrusal kalır (ReturnPathStitchingVia'daki via-count istisnasıyla
              // aynı desen). Strain sweep'in y-ekseni de iki dekat kapsar (ε ∝ 1/R);
              // diğer üç eksende y birkaç dekada yayılmıyor, doğrusal bırakılır.
              xScale={sweepParam === SWEEP_TEMPERATURE ? 'linear' : 'log'}
              yScale={sweepParam === SWEEP_STRAIN ? 'log' : 'linear'}
              xLabel={text.sweepAxisX[sweepParam]}
              yLabel={text.sweepAxisY[sweepParam]}
              series={chartSeries}
              marker={s.marker ? { ...s.marker, label: text.operatingPoint } : null}
              formatX={formatSweepX}
              formatY={(v) => fmt(v, 3)}
              caption={text.sweepCaption[sweepParam]}
            />

            <ChartDataTable
              xLabel={text.sweepAxisX[sweepParam]}
              series={chartSeries}
              every={8}
              formatX={formatSweepX}
              formatY={(v) => fmt(v, 4)}
            />
          </>
        ) : (
          <p className="empty-note">{ui.chartNeedsInput}</p>
        )}
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} chartRef={chartRef} />
      <SaveToProject
        toolKey="flex-pcb-bend-trace"
        f={f}
        r={r}
        section={reportSection}
        schematicRef={schematicRef}
        chartRef={chartRef}
        saved={saved}
      />
    </>
  )
}
