// Kalıcı depolama portu.
//
// `lib/` altındaki modüller `localStorage`'a doğrudan konuşmaz; bu arayüzü
// parametre olarak alır. Böylece hesap ve doğrulama katmanı tarayıcı API'sine
// bağlı kalmaz, testte sahte depo verilebilir.
//
// Arayüz sözleşmesi:
//   read(key)         → string | null
//   write(key, value) → { ok: true } | { error, message }
//   remove(key)       → { ok: true } | { error, message }

export const STORAGE_ERR_UNAVAILABLE = 'unavailable'
export const STORAGE_ERR_WRITE = 'write'

// Depolama hiç yoksa (SSR, kapalı çerez, gizli sekme) sessizce boş davranır:
// okuma null döner, yazma açık hata döner. Uygulama çalışmaya devam eder.
export const nullStorage = {
  read: () => null,
  write: () => ({ error: STORAGE_ERR_UNAVAILABLE, message: 'Tarayıcı depolaması kullanılamıyor.' }),
  remove: () => ({ error: STORAGE_ERR_UNAVAILABLE, message: 'Tarayıcı depolaması kullanılamıyor.' }),
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
        // Kota dolması en olası neden; mesaj kullanıcıya gösterilir
        return { error: STORAGE_ERR_WRITE, message: `Kaydedilemedi: ${e.message}` }
      }
    },
    remove(key) {
      try {
        ls.removeItem(key)
        return { ok: true }
      } catch (e) {
        return { error: STORAGE_ERR_WRITE, message: `Silinemedi: ${e.message}` }
      }
    },
  }
}

// Uygulamanın kullandığı tekil örnek. Arayüz katmanı bunu `lib/` fonksiyonlarına
// geçirir; `lib/` içinden doğrudan çağrılmaz.
export const defaultStorage = browserStorage()
