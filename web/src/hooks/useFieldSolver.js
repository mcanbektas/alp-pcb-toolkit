// Alan çözücüsünün Web Worker bağı (brif 09 karar #9).
//
// `lib/fieldSolver.js` saf ve senkron kalır; tarayıcı API'si (Worker) yalnız
// bu katmandadır. İlk render'da HİÇBİR ŞEY yapılmaz — hydration kuralı:
// prerender'lı HTML ile ilk client render'ı birebir aynıdır, çözücü sonucu
// mount'tan sonra gelir ve o ana kadar senkron sonuç (varsa) ekranda kalır.
//
// params null ise (geçersiz form, desteklenmeyen yapı) kanca 'idle' döner.
// params: { kind: 'single' | 'pair' | 'gcpw',
//           structure: 'microstrip' | 'stripline' | 'gcpw',
//           W, S, height, t, epsR } — SI. S yalnız pair/gcpw işlerinde okunur.

import { useEffect, useRef, useState } from 'react'

// Kullanıcı yazarken her tuşta ~yüzlerce ms'lik iş başlatmamak için iş,
// son değişiklikten bu kadar sonra worker'a verilir
const DEBOUNCE_MS = 250

export default function useFieldSolver(params) {
  const [state, setState] = useState({ status: 'idle', result: null })
  const workerRef = useRef(null)
  const jobRef = useRef(0)

  // Nesne kimliği her render'da değişir; efekt yalnız değerlere bakar
  const key = params
    ? [
        params.kind ?? 'single', params.structure,
        params.W, params.S ?? 0, params.height, params.t, params.epsR,
      ].join('|')
    : null

  useEffect(() => {
    if (!key || typeof Worker === 'undefined') {
      jobRef.current += 1 // yolda olan iş bayatlasın
      setState({ status: 'idle', result: null })
      return undefined
    }

    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('./fieldSolver.worker.js', import.meta.url),
        { type: 'module' },
      )
    }
    const worker = workerRef.current
    const id = jobRef.current + 1
    jobRef.current = id
    setState({ status: 'running', result: null })

    const onMessage = (e) => {
      if (e.data.id !== jobRef.current) return // bayat iş — yenisi yolda
      setState({ status: 'done', result: e.data.r })
    }
    worker.addEventListener('message', onMessage)

    const [kind, structure, W, S, height, t, epsR] = key.split('|')
    const timer = setTimeout(() => {
      worker.postMessage({
        id,
        params: { kind, structure, W: +W, S: +S, height: +height, t: +t, epsR: +epsR },
      })
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      worker.removeEventListener('message', onMessage)
    }
  }, [key])

  useEffect(() => () => {
    workerRef.current?.terminate()
    workerRef.current = null
  }, [])

  return state
}
