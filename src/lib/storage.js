// Kalıcı depolama portu.
//
// `lib/` altındaki modüller `localStorage`'a doğrudan konuşmaz; bu arayüzü
// parametre olarak alır. Böylece hesap ve doğrulama katmanı tarayıcı API'sine
// bağlı kalmaz, testte sahte depo verilebilir.
//
// Arayüz sözleşmesi:
//   read(key)         → string | null
//   write(key, value) → { ok: true } | { error, op }
//   remove(key)       → { ok: true } | { error, op }
//
// Hata yükü dilsizdir: yalnızca kod taşır, cümle taşımaz. Cümleyi kuran taraf
// ekranın text.js dosyasıdır. `op` hangi eylemin başarısız olduğunu söyler —
// "yazılamadı" ile "silinemedi" ayrımı burada cümleyle değil kodla yapılır.

export const STORAGE_ERR_UNAVAILABLE = 'unavailable'
export const STORAGE_ERR_WRITE = 'write'

export const STORAGE_OP_WRITE = 'write'
export const STORAGE_OP_REMOVE = 'remove'

// Tarayıcının kendi istisna metni (kota, izin) hata yüküne sayılabilir alan
// olarak eklenmez: dili tarayıcının diline bağlıdır, kullanıcıya gösterilemez.
// Yalnızca geliştirici teşhisi için, sayılamayan (non-enumerable) `_cause`
// alanında taşınır — Object.keys, spread ve JSON.stringify onu görmez, bu yüzden
// hiçbir ekrana sızamaz.
function storageError(error, op, cause) {
  const payload = { error, op }
  if (cause !== undefined) {
    Object.defineProperty(payload, '_cause', { value: cause, enumerable: false })
  }
  return payload
}

// Depolama hiç yoksa (SSR, kapalı çerez, gizli sekme) sessizce boş davranır:
// okuma null döner, yazma açık hata döner. Uygulama çalışmaya devam eder.
export const nullStorage = {
  read: () => null,
  write: () => storageError(STORAGE_ERR_UNAVAILABLE, STORAGE_OP_WRITE),
  remove: () => storageError(STORAGE_ERR_UNAVAILABLE, STORAGE_OP_REMOVE),
}

// Test ve önizleme için bellek içi depo. Aynı sözleşmeyi uygular.
export function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial))
  return {
    read: (key) => (map.has(key) ? map.get(key) : null),
    write: (key, value) => { map.set(key, value); return { ok: true } },
    remove: (key) => { map.delete(key); return { ok: true } },
    // Yalnızca testte kullanılır
    _dump: () => Object.fromEntries(map),
  }
}

// Tarayıcı uygulaması. localStorage erişimi bazı ortamlarda okuma anında
// istisna fırlatır, bu yüzden erişim try içinde yoklanır.
export function browserStorage() {
  let ls = null
  try {
    ls = typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    ls = null
  }
  if (!ls) return nullStorage

  return {
    read(key) {
      try {
        return ls.getItem(key)
      } catch {
        return null
      }
    },
    write(key, value) {
      try {
        ls.setItem(key, value)
        return { ok: true }
      } catch (e) {
        // Kota dolması en olası neden. Tarayıcının kendi metni kullanıcıya
        // gösterilmez, yalnızca teşhis için `_cause` altında taşınır.
        return storageError(STORAGE_ERR_WRITE, STORAGE_OP_WRITE, e?.message)
      }
    },
    remove(key) {
      try {
        ls.removeItem(key)
        return { ok: true }
      } catch (e) {
        return storageError(STORAGE_ERR_WRITE, STORAGE_OP_REMOVE, e?.message)
      }
    },
  }
}

// Uygulamanın kullandığı tekil örnek. Arayüz katmanı bunu `lib/` fonksiyonlarına
// geçirir; `lib/` içinden doğrudan çağrılmaz.
export const defaultStorage = browserStorage()
