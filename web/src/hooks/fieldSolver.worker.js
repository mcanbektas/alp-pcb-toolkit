// Alan çözücüsünü ana iş parçacığının dışında koşturan Web Worker.
// Mantık taşımaz: geometriyi saf motora (lib/fieldSolver.js) geçirir,
// sonucu iş kimliğiyle geri postalar. Bayat iş ayıklama kancadadır.
//
// params.kind işi seçer: 'single' (F1), 'pair' ve 'gcpw' (F2),
// 'pair-spacing' ve 'gcpw-width' solver-in-loop sentezleri (F3).

import {
  fieldMicrostrip, fieldStripline, fieldDifferentialPair, fieldGroundedCpw,
  fieldSolveSpacingForZdiff, fieldSolveGcpwWidthForZ0,
} from '../lib/fieldSolver'

function solve(params) {
  const { kind, structure, W, S, height, t, epsR, target } = params
  if (kind === 'pair') {
    return fieldDifferentialPair({ structure, W, S, H: height, t, epsR })
  }
  if (kind === 'pair-spacing') {
    return fieldSolveSpacingForZdiff({ structure, W, H: height, t, epsR, target })
  }
  if (kind === 'gcpw') {
    return fieldGroundedCpw({ W, S, H: height, t, epsR })
  }
  if (kind === 'gcpw-width') {
    return fieldSolveGcpwWidthForZ0({ S, H: height, t, epsR, target })
  }
  return structure === 'stripline'
    ? fieldStripline({ W, b: height, t, epsR })
    : fieldMicrostrip({ W, H: height, t, epsR })
}

self.onmessage = (e) => {
  const { id, params } = e.data
  self.postMessage({ id, r: solve(params) })
}
