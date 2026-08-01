// SingleEnded ve DiffPair ekranlarının F2'de eklenen text yolları iki dilde
// gerçekten var mı, arity tutuyor mu — dfmTextPaths.test.js'in elle taranmış
// dar kapsamlı karşılığı. Bu yollar build'den kaçar: `text.foo` yoksa React
// sessizce boş basar (CLAUDE.md "Dil" bölümü). Çözücü yorumları üç worker
// durumunda da (running / error / done) yürütülür ki koşullu dallar tek dille
// kalmasın.

import { describe, it, expect } from 'vitest'
import { getText as seText } from './SingleEnded/text'
import { getText as dpText } from './DiffPair/text'

const langs = ['tr', 'en']

describe('SingleEnded F2 text yolları', () => {
  for (const lang of langs) {
    it(`(${lang}) yeni yollar tanımlı ve doğru türde`, () => {
      const t = seText(lang)
      expect(typeof t.pct).toBe('function')
      expect(typeof t.methodNoteSolver).toBe('string')
      expect(t.methodNoteSolver.length).toBeGreaterThan(0)
      expect(typeof t.bigResultPending).toBe('string')
      expect(typeof t.fields.tField.hintSolver).toBe('string')
      expect(typeof t.structLabel.gcpw).toBe('string')
      expect(typeof t.formula.gcpw).toBe('string')
      expect(typeof t.detail.solverOnly).toBe('string')
      expect(typeof t.detail.solverMesh).toBe('function')
      expect(t.detail.solverMesh('10×10')).toContain('10×10')
      expect(typeof t.detail.solverSynthesis).toBe('function')
      expect(t.detail.solverSynthesis('brent', 7)).toContain('7')
      expect(typeof t.detail.solverSynthesisPending).toBe('string')
      expect(typeof t.schematic.caption.gcpw).toBe('string')
      expect(typeof t.schematic.refPlane).toBe('string')

      // gcpw commentary: pending, hata ve tamamlanmış durumlar patlamamalı
      const rG = { ok: true, solverOnly: true, structure: 'gcpw', W: 4e-4, height: 2e-4, target: null }
      expect(t.commentary(rG, { status: 'running', result: null }).length).toBeGreaterThan(0)
      expect(t.commentary(rG, { status: 'done', result: { error: 'fs-grid-too-large' } }).length).toBeGreaterThan(0)
      const fs = { Z0: 48, epsEff: 3.1, tpd: 5.9e-9, convergence: { coarsePct: 0.3 }, mesh: { fine: { nx: 10, ny: 10 } }, model: 'x' }
      const done = t.commentary(rG, { status: 'done', result: fs })
      expect(done.length).toBeGreaterThan(0)
      for (const n of done) expect(n.text).not.toContain('undefined')

      // gcpw sentez yorumu (F3): bulunan genişlik + kök arama bilgisi
      const rSyn = { ...rG, W: null, target: 50 }
      const fsSyn = { ...fs, W: 3.4e-4, solvedBy: 'brent', search: { evals: 7 } }
      const doneSyn = t.commentary(rSyn, { status: 'done', result: fsSyn })
      for (const n of doneSyn) expect(n.text).not.toContain('undefined')
    })
  }
})

describe('DiffPair F2 text yolları', () => {
  for (const lang of langs) {
    it(`(${lang}) yollar tanımlı ve doğru türde`, () => {
      const t = dpText(lang)
      expect(typeof t.pct).toBe('function')
      expect(typeof t.methodNote).toBe('string')
      expect(typeof t.bigResultPending).toBe('string')
      expect(typeof t.solver.pending).toBe('string')
      expect(typeof t.solver.rowConv).toBe('string')
      expect(typeof t.solver.rowMethod).toBe('string')
      expect(typeof t.solver.convLevel).toBe('function')
      expect(typeof t.solver.errNote).toBe('function')
      expect(typeof t.fields.SFixedHint).toBe('string')
      expect(typeof t.fields.fixed.label).toBe('string')
      expect(typeof t.fields.WFixed.label).toBe('string')
      expect(typeof t.fields.SFixed.label).toBe('string')
      expect(typeof t.fixedLabel.width).toBe('string')
      expect(typeof t.fixedLabel.spacing).toBe('string')
      expect(typeof t.bigResultSpacing).toBe('string')
      expect(typeof t.table.epsEffOdd).toBe('string')
      expect(typeof t.table.tpdEven).toBe('string')
      expect(typeof t.detail.model('closed-form')).toBe('string')
      expect(t.detail.matrix('1', '2')).toContain('pF/m')
      expect(t.detail.mesh('a', 'b')).toContain('a')
      expect(typeof t.detail.solved('brent')).toBe('string')
      expect(t.detail.solvedSpacing('brent', 8)).toContain('8')
      expect(typeof t.detail.spacingPending).toBe('string')
      expect(typeof t.singleEndedZ0).toBe('string')
      expect(typeof t.targetWord).toBe('string')

      // commentary üç çözücü durumunda da patlamamalı, undefined sızdırmamalı
      const r = {
        ok: true, mode: 'ana', structure: 'microstrip',
        W: 2e-4, S: 2e-4, H: 2e-4, t: 3.5e-5, epsR: 4.2,
        Z0: 60, epsEff: 3.2, singleMethod: 'closed-form', singleInRange: true,
        tpdPsPerMm: 6, ratio: 1, target: null, acceptPct: null,
        solvedBy: null, solvedFor: null,
      }
      const fs = {
        Zdiff: 100, Zodd: 50, Zeven: 70, Zcommon: 35,
        epsEffOdd: 2.9, epsEffEven: 3.3, tpdOdd: 5.7e-9, tpdEven: 6.1e-9,
        C11: 1e-10, C12: -2e-11,
        convergence: { coarsePct: 0.4 },
        mesh: { even: { nx: 1, ny: 1 }, odd: { nx: 1, ny: 1 } },
        model: 'fdm-pcg-energy-even-odd',
      }
      for (const solver of [
        { status: 'running', result: null },
        { status: 'done', result: { error: 'fs-no-convergence' } },
        { status: 'done', result: fs },
      ]) {
        const notes = t.commentary(r, solver)
        expect(notes.length).toBeGreaterThan(0)
        for (const n of notes) expect(n.text).not.toContain('undefined')
      }

      // sentez dalları: errPct hesapları — W sabit (tohum) ve S sabit (çözücüde kök)
      const rSyn = { ...r, mode: 'syn', target: 100, acceptPct: 10, solvedBy: 'brent', solvedFor: 'W' }
      const notesSyn = t.commentary(rSyn, { status: 'done', result: fs })
      for (const n of notesSyn) expect(n.text).not.toContain('undefined')

      const rSynS = { ...r, S: null, ratio: null, mode: 'syn', target: 100, acceptPct: 10, solvedBy: null, solvedFor: 'S' }
      const fsS = { ...fs, S: 1.3e-4, solvedBy: 'brent', search: { evals: 8 } }
      for (const solver of [
        { status: 'running', result: null },
        { status: 'done', result: fsS },
      ]) {
        const notes = t.commentary(rSynS, solver)
        for (const n of notes) expect(n.text).not.toContain('undefined')
      }
    })
  }
})
