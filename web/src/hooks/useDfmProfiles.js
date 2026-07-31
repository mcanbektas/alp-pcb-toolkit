// Üretici yetenek profilleri için React bağı.
//
// Katman kuralı: `lib/dfmProfile.js` saftır ve depolama portunu parametre
// olarak alır; tarayıcı API'sini tanıyan somut port yalnızca burada bağlanır.
// Ekran ne `localStorage`'ı ne de `JSON.parse`'ı görür — yalnızca bu hook'un
// döndürdüğü listeyi, aktif profili ve eylemleri kullanır.
// `useSavedThickness` ile birebir aynı desen.
//
// Hata durumu burada tutulmaz: eylemler depo sözleşmesinin sonucunu
// ({ profile } | { ok: true } | { error, ...ayrıntı }) olduğu gibi döndürür.
// Ayrıntı alanları dilsizdir; iki dilli cümleyi ekranın text.js dosyası kurar.
//
// Aktif profil yokken hesaplar yine çalışır: `limits` bütün alanları null olan
// bir küme döner ve profile bağlı kontroller `unknown` olur. Sessiz bir
// varsayılan üretici değeri hiçbir yolda üretilmez.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { defaultStorage, nullStorage } from '../lib/storage'
import {
  createDfmProfileStore, limitsToSI, noProfileLimits, parseProfileJson, profileToJson,
  DFM_ERR_NOT_FOUND,
} from '../lib/dfmProfile'

// Sabit boş liste: her render'da yeni dizi üretmek, listeyi bağımlılık dizisinde
// taşıyan ekranlarda gereksiz yeniden hesap demek olurdu.
const EMPTY_LIST = []

export default function useDfmProfiles(storage = defaultStorage) {
  const store = useMemo(() => createDfmProfileStore(storage), [storage])

  // Depo İLK RENDER'DA OKUNMAZ, mount'tan sonra okunur. Gerekçe hydration:
  // araç sayfaları derleme sonrası prerender'lanıyor
  // (`scripts/build-prerender.mjs`) ve prerender sunucuda koşarken depo yok —
  // ilk render burada depoyu okusaydı sunucudaki ağaç (profil yok, depolama
  // erişilemez) tarayıcıdakiyle ayrışır ve React bütün araç ekranını sessizce
  // yeniden çizerdi. Dört DFM ekranında ölçülen sonuç tam olarak buydu.
  //
  // Karşılığı, kayıtlı profili olan kullanıcıda bir karelik "profil yok"
  // görüntüsüdür. `LangProvider` ile aynı takas — bkz. docs/prerender-karari.md §2.
  //
  // Depolamaya erişilemiyorsa `browserStorage()` zaten `nullStorage`'a düşer,
  // bozuk kayıtta liste boş döner; ikisinde de istisna dışarı sızmaz.
  const [profiles, setProfiles] = useState(EMPTY_LIST)
  const [activeId, setActiveId] = useState(null)
  const [available, setAvailable] = useState(true)

  const refresh = useCallback(() => {
    setProfiles(store.list())
    setActiveId(store.activeId())
  }, [store])

  useEffect(() => {
    refresh()
    setAvailable(storage !== nullStorage)
  }, [refresh, storage])

  const save = useCallback((profile) => {
    const res = store.save(profile)
    if (!res.error) refresh()
    return res
  }, [store, refresh])

  const remove = useCallback((id) => {
    const res = store.remove(id)
    if (!res.error) refresh()
    return res
  }, [store, refresh])

  const selectActive = useCallback((id) => {
    const res = store.setActive(id)
    if (!res.error) refresh()
    return res
  }, [store, refresh])

  // İçe aktarma doğrulamayı geçerse kaydeder ve aktif yapar: kullanıcı
  // yüklediği profili ayrıca seçmek zorunda kalmasın.
  const importJson = useCallback((json) => {
    const parsed = parseProfileJson(json)
    if (parsed.error) return parsed
    const saved = store.save(parsed.profile)
    if (saved.error) return saved
    const activated = store.setActive(saved.profile.id)
    refresh()
    // Kayıt tuttu ama aktifleştirme tutmadıysa bu bir depolama hatasıdır;
    // sessizce yutulmaz.
    if (activated.error) return activated
    return saved
  }, [store, refresh])

  const exportJson = useCallback((id) => {
    const profile = store.get(id)
    if (!profile) return { error: DFM_ERR_NOT_FOUND, id }
    return profileToJson(profile)
  }, [store])

  const active = useMemo(
    () => profiles.find((p) => p.id === activeId) ?? null,
    [profiles, activeId],
  )

  // Hesap motorlarının gördüğü tek yüz: SI birimine çevrilmiş sınır kümesi.
  // Profil yoksa bütün alanlar null'dır.
  const limits = useMemo(
    () => (active ? limitsToSI(active.limits) : noProfileLimits()),
    [active],
  )

  return {
    profiles,
    active,
    activeId,
    limits,
    hasProfile: active !== null,
    available,
    save,
    remove,
    selectActive,
    importJson,
    exportJson,
  }
}
