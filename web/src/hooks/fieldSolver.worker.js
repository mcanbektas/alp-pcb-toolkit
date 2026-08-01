// Alan çözücüsünü ana iş parçacığının dışında koşturan Web Worker.
// Mantık taşımaz: geometriyi saf motora (lib/fieldSolver.js) geçirir,
// sonucu iş kimliğiyle geri postalar. Bayat iş ayıklama kancadadır.
//
// params.kind işi seçer: 'single' (F1), 'pair' ve 'gcpw' (F2).

import {
  fieldMicrostrip, fieldStripline, fieldDifferentialPair, fieldGroundedCpw,
} from '../lib/fieldSolver'

function solve(params) {
  const { kind, structure, W, S, height, t, epsR } = params
  if (kind === 'pair') {
    return fieldDifferentialPair({ structure, W, S, H: height, t, epsR })
  }
  if (kind === 'gcpw') {
    return fieldGroundedCpw({ W, S, H: height, t, epsR })
  }
  return structure === 'stripline'
    ? fieldStripline({ W, b: height, t, epsR })
    : fieldMicrostrip({ W, H: height, t, epsR })
}

self.onmessage = (e) => {
  const { id, params } = e.data
  self.postMessage({ id, r: solve(params) })
}
