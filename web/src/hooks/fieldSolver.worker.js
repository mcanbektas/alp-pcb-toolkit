// Alan çözücüsünü ana iş parçacığının dışında koşturan Web Worker.
// Mantık taşımaz: geometriyi saf motora (lib/fieldSolver.js) geçirir,
// sonucu iş kimliğiyle geri postalar. Bayat iş ayıklama kancadadır.

import { fieldMicrostrip, fieldStripline } from '../lib/fieldSolver'

self.onmessage = (e) => {
  const { id, params } = e.data
  const r = params.structure === 'stripline'
    ? fieldStripline({ W: params.W, b: params.height, t: params.t, epsR: params.epsR })
    : fieldMicrostrip({ W: params.W, H: params.height, t: params.t, epsR: params.epsR })
  self.postMessage({ id, r })
}
