import { describe, it, expect, afterEach } from 'vitest'
import {
  memoryStorage, nullStorage, browserStorage, defaultStorage,
  STORAGE_ERR_UNAVAILABLE, STORAGE_ERR_WRITE,
  STORAGE_OP_WRITE, STORAGE_OP_REMOVE,
} from './storage'

// Hata yükü dilsiz olmalı: sayılabilir her dize alanı kod biçiminde
// (küçük harf + tire) olmalı, kurulmuş bir cümle olmamalı. Bu kontrol
// Türkçe (ya da tarayıcı dilinde) bir cümlenin yüke geri sızmasını engeller.
const CODE_RE = /^[a-z][a-z0-9-]*$/

function expectCodeOnly(payload) {
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === 'number') continue
    expect(typeof value, `${key} alanı dize ya da sayı olmalı`).toBe('string')
    expect(value, `${key} alanı kod değil, cümle taşıyor`).toMatch(CODE_RE)
  }
}

// browserStorage global `localStorage` kimliğine bakar. Testler bu globali geçici
// olarak kurar; afterEach başlangıç durumunu birebir geri koyar, global sızmaz.
const LS = 'localStorage'
const ORIGINAL = Object.getOwnPropertyDescriptor(globalThis, LS)

function installLocalStorage(value) {
  Object.defineProperty(globalThis, LS, { value, configurable: true, writable: true })
}

function installThrowingLocalStorage() {
  Object.defineProperty(globalThis, LS, {
    configurable: true,
    get() { throw new Error('erişim engellendi') },
  })
}

function removeLocalStorage() {
  delete globalThis[LS]
}

// Sözleşmeye uyan sahte tarayıcı deposu
function fakeLocalStorage(initial = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)) },
    removeItem: (k) => { map.delete(k) },
  }
}

afterEach(() => {
  if (ORIGINAL) Object.defineProperty(globalThis, LS, ORIGINAL)
  else removeLocalStorage()
})

const isPort = (s) =>
  typeof s?.read === 'function' && typeof s?.write === 'function' && typeof s?.remove === 'function'

describe('hata kodları', () => {
  it('iki kod birbirinden ayrıdır', () => {
    expect(STORAGE_ERR_UNAVAILABLE).toBe('unavailable')
    expect(STORAGE_ERR_WRITE).toBe('write')
  })
})

describe('port sözleşmesi', () => {
  it('üç uygulama da read/write/remove sunar', () => {
    expect(isPort(nullStorage)).toBe(true)
    expect(isPort(memoryStorage())).toBe(true)
    expect(isPort(browserStorage())).toBe(true)
    expect(isPort(defaultStorage)).toBe(true)
  })

  it('nullStorage sözleşme dışında alan taşımaz', () => {
    expect(Object.keys(nullStorage)).toEqual(['read', 'write', 'remove'])
  })
})

describe('memoryStorage', () => {
  it('olmayan anahtar için null döner', () => {
    expect(memoryStorage().read('yok')).toBeNull()
  })

  it('yazılan değer aynen okunur', () => {
    const s = memoryStorage()
    expect(s.write('a', 'x')).toEqual({ ok: true })
    expect(s.read('a')).toBe('x')
  })

  it('aynı anahtara yazma üzerine yazar', () => {
    const s = memoryStorage()
    s.write('a', '1')
    s.write('a', '2')
    expect(s.read('a')).toBe('2')
    expect(s._dump()).toEqual({ a: '2' })
  })

  it('silme başarı döner ve okuma null olur', () => {
    const s = memoryStorage()
    s.write('a', 'x')
    expect(s.remove('a')).toEqual({ ok: true })
    expect(s.read('a')).toBeNull()
  })

  it('olmayan anahtarı silmek de başarı döner', () => {
    expect(memoryStorage().remove('yok')).toEqual({ ok: true })
  })

  it('başlangıç değerleriyle kurulabilir', () => {
    const s = memoryStorage({ k: 'v', j: '2' })
    expect(s.read('k')).toBe('v')
    expect(s._dump()).toEqual({ k: 'v', j: '2' })
  })

  it('başlangıç nesnesini değiştirmez', () => {
    const initial = { a: '1' }
    const s = memoryStorage(initial)
    s.write('b', '2')
    s.remove('a')
    expect(initial).toEqual({ a: '1' })
    expect(s._dump()).toEqual({ b: '2' })
  })

  it('örnekler birbirinden bağımsızdır', () => {
    const a = memoryStorage()
    const b = memoryStorage()
    a.write('k', 'a-değeri')
    expect(b.read('k')).toBeNull()
  })

  it('_dump yalnızca test için tüm içeriği verir', () => {
    const s = memoryStorage()
    s.write('x', '1')
    s.write('y', '2')
    expect(s._dump()).toEqual({ x: '1', y: '2' })
  })
})

describe('nullStorage', () => {
  it('okuma her zaman null döner', () => {
    expect(nullStorage.read('a')).toBeNull()
    nullStorage.write('a', 'x')
    expect(nullStorage.read('a')).toBeNull()
  })

  it('yazma açık hata kodu döner, istisna fırlatmaz', () => {
    const r = nullStorage.write('a', 'x')
    expect(r.error).toBe(STORAGE_ERR_UNAVAILABLE)
    expect(r.op).toBe(STORAGE_OP_WRITE)
    expect(r.ok).toBeUndefined()
    expectCodeOnly(r)
  })

  it('silme açık hata kodu döner, istisna fırlatmaz', () => {
    const r = nullStorage.remove('a')
    expect(r.error).toBe(STORAGE_ERR_UNAVAILABLE)
    expect(r.op).toBe(STORAGE_OP_REMOVE)
    expect(r.ok).toBeUndefined()
    expectCodeOnly(r)
  })

  it('hata yükü cümle taşımaz — yalnızca error ve op alanları vardır', () => {
    expect(Object.keys(nullStorage.write('a', 'x')).sort()).toEqual(['error', 'op'])
    expect(Object.keys(nullStorage.remove('a')).sort()).toEqual(['error', 'op'])
  })

  it('hiçbir çağrı fırlatmaz', () => {
    expect(() => {
      nullStorage.read('a')
      nullStorage.write('a', 'x')
      nullStorage.remove('a')
    }).not.toThrow()
  })
})

describe('browserStorage — depolama yokken', () => {
  it('localStorage tanımsızsa doğrudan nullStorage döner', () => {
    removeLocalStorage()
    expect(typeof globalThis[LS]).toBe('undefined')
    expect(browserStorage()).toBe(nullStorage)
  })

  it('localStorage erişimi fırlatıyorsa nullStorage döner', () => {
    installThrowingLocalStorage()
    expect(browserStorage()).toBe(nullStorage)
  })

  it('localStorage null ise nullStorage döner', () => {
    installLocalStorage(null)
    expect(browserStorage()).toBe(nullStorage)
  })
})

describe('browserStorage — çalışan depolama', () => {
  it('nullStorage değil, gerçek uygulamadır', () => {
    installLocalStorage(fakeLocalStorage())
    expect(browserStorage()).not.toBe(nullStorage)
  })

  it('okuma/yazma/silme localStorage’a geçer', () => {
    installLocalStorage(fakeLocalStorage())
    const s = browserStorage()
    expect(s.read('k')).toBeNull()
    expect(s.write('k', '1')).toEqual({ ok: true })
    expect(s.read('k')).toBe('1')
    expect(s.remove('k')).toEqual({ ok: true })
    expect(s.read('k')).toBeNull()
  })

  it('var olan içeriği okur', () => {
    installLocalStorage(fakeLocalStorage({ k: 'v' }))
    expect(browserStorage().read('k')).toBe('v')
  })
})

describe('browserStorage — fırlatan depolama', () => {
  const thrower = {
    getItem: () => { throw new Error('okuma engelli') },
    setItem: () => { throw new Error('kota dolu') },
    removeItem: () => { throw new Error('silme engelli') },
  }

  it('okuma istisnası null olarak yutulur', () => {
    installLocalStorage(thrower)
    expect(browserStorage().read('k')).toBeNull()
  })

  it('yazma istisnası yazma hata kodunu op ile döner', () => {
    installLocalStorage(thrower)
    const r = browserStorage().write('k', 'v')
    expect(r.error).toBe(STORAGE_ERR_WRITE)
    expect(r.op).toBe(STORAGE_OP_WRITE)
    expect(r.ok).toBeUndefined()
    expectCodeOnly(r)
  })

  it('silme istisnası yazma hata kodunu remove op ile döner', () => {
    installLocalStorage(thrower)
    const r = browserStorage().remove('k')
    expect(r.error).toBe(STORAGE_ERR_WRITE)
    expect(r.op).toBe(STORAGE_OP_REMOVE)
    expect(r.ok).toBeUndefined()
    expectCodeOnly(r)
  })

  // Tarayıcının kendi istisna metni kullanıcıya gösterilemez: dili tarayıcının
  // diline bağlıdır. Yalnızca geliştirici teşhisi için, sayılamayan `_cause`
  // alanında durur — Object.keys, spread ve JSON.stringify onu görmez.
  it('tarayıcının istisna metni sayılabilir alan olarak sızmaz', () => {
    installLocalStorage(thrower)
    const r = browserStorage().write('k', 'v')

    expect(Object.keys(r).sort()).toEqual(['error', 'op'])
    expect(JSON.stringify(r)).not.toContain('kota dolu')
    expect(JSON.stringify({ ...r })).not.toContain('kota dolu')
    expect(Object.values(r).join(' ')).not.toContain('kota dolu')

    // Teşhis alanı yine de erişilebilir kalır, ama yalnızca adıyla istenirse
    expect(r._cause).toContain('kota dolu')
    expect(Object.getOwnPropertyDescriptor(r, '_cause').enumerable).toBe(false)
  })

  it('hiçbir çağrı fırlatmaz', () => {
    installLocalStorage(thrower)
    const s = browserStorage()
    expect(() => {
      s.read('k')
      s.write('k', 'v')
      s.remove('k')
    }).not.toThrow()
  })
})

describe('global sızıntı', () => {
  it('testler localStorage globalini başlangıç durumunda bırakır', () => {
    expect(Object.getOwnPropertyDescriptor(globalThis, LS)).toEqual(ORIGINAL)
  })
})
