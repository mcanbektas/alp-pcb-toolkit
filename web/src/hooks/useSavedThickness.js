// Kayıtlı kalınlıklar için React bağı (spec §4.3, Faz 7).
//
// İki kaynak, tek sözleşme:
//   - oturum açılmamışken kayıtlar tarayıcıda durur (`lib/storage.js` portu),
//   - oturum açıkken hesabın altında durur (`/api/thickness-records`),
//     böylece aynı liste ikinci bir bilgisayarda da görünür.
//
// İlk girişte tarayıcıdaki kayıtlar hesaba BİR KEZ kopyalanır: kullanıcı bugüne
// kadar biriktirdiklerini kaybetmesin. Sunucuda aynı adlı kayıt varsa hesaptaki
// korunur — o, cihazdaki kopyadan daha güncel sayılır. Yerel kopya silinmez;
// çıkış yapıldığında kullanıcı yine kendi listesini görür.
//
// İlk boyamada hangi liste basılır: oturum açmış bir tarayıcıda hesabın
// listesi beklenir ve o gelene kadar liste boş + `loading` açık kalır; hiç
// oturum açılmamış bir tarayıcıda yerel liste anında basılır. Ayrıntı
// aşağıdaki `SERVER_BACKED_KEY` notunda.
//
// Katman kuralı korunuyor: doğrulama ve zarf şeması saf katmanda
// (`lib/thicknessRecords.js`), tarayıcı deposu ve ağ yalnızca burada.
//
// Hata sözleşmesi de korunuyor: `save`/`remove` her iki kaynakta da saf katmanın
// şeklini döndürür ({ record } | { ok: true } | { error, ...ayrıntı }). Sunucu
// hata kodları buraya çevrilir, ekranın metin dosyası değişmez.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { defaultStorage, nullStorage } from '../lib/storage'
import {
  createThicknessStore, validateRecord, recordId,
  SCHEMA_VERSION, THICKNESS_ERR_STORAGE, THICKNESS_ERR_LIMIT,
} from '../lib/thicknessRecords'
import { useAuth } from './useAuth'

const RECORDS_PATH = '/api/thickness-records'

// Hangi hesap için taşıma yapıldığı burada durur. Kullanıcı başına tutulur:
// aynı tarayıcıyı iki hesap kullanıyorsa ikisine de bir kez taşınır.
const MIGRATED_KEY = 'alp-pcb.thickness.migrated.v1'

// "Bu tarayıcı en son oturum açmış hâlde gördü" ipucu. Erişim token'ı yalnız
// bellekte, yenileme çerezi HttpOnly — yani ilk boyamada oturumun olup
// olmadığını JS'ten SORAMIYORUZ, `useAuth` bir tur ağ gidip gelene kadar
// `isLoading` durumunda. O tur boyunca yerel listeyi basmak, girişli kullanıcıya
// bir an BAŞKA birinin (kendi cihaz kopyasının) listesini göstermek demekti:
// ölçüldü, 46 ms. Bu bayrak varken liste boş ve `loading` başlar, gelen tek
// içerik hesabın listesi olur. Bayrak yoksa hiç oturum açılmamış demektir ve
// yerel liste eskiden olduğu gibi anında görünür — girişsiz kullanım yavaşlamaz.
// Oturumun kapandığı anlaşıldığında bayrak silinir; bayat kalırsa bedeli tek
// yüklemede kısa bir "yükleniyor" notudur, sonra kendini düzeltir.
const SERVER_BACKED_KEY = 'alp-pcb.thickness.serverbacked.v1'

const EMPTY = []

function readMigrated(storage) {
  const raw = storage.read(MIGRATED_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

function markMigrated(storage, userId) {
  const list = readMigrated(storage)
  if (list.includes(userId)) return
  storage.write(MIGRATED_KEY, JSON.stringify([...list, userId]))
}

// Sunucu satırını saf kayda çevirir. Zarf yine `validateRecord`'dan geçer:
// başka bir sürümden ya da elle yazılmış bir satır sessizce yanlış okunmaz.
// Kimlik sunucununkidir — silme o kimlikle yapılır.
function fromDto(dto) {
  let parsed
  try {
    parsed = JSON.parse(dto.dataJson)
  } catch {
    return null
  }
  const check = validateRecord(parsed)
  if (check.error) return null
  return { ...check.record, id: dto.id }
}

// Ağ/uç hatasını saf katmanın hata şekline çevirir; ekran aynı metinleri kurar.
function toStoreError(res) {
  if (res.error === 'RECORD_LIMIT') {
    return { error: THICKNESS_ERR_LIMIT, limit: res.detail?.limit, stored: res.detail?.stored }
  }
  return { error: THICKNESS_ERR_STORAGE, cause: res.error }
}

export default function useSavedThickness(storage = defaultStorage) {
  const { isAuthenticated, isLoading: authLoading, user, api } = useAuth()
  const store = useMemo(() => createThicknessStore(storage), [storage])

  const userId = user?.id ?? null
  const onServer = isAuthenticated && userId !== null

  // İlk render'ın kararı: hesabın listesi mi bekleniyor, yerel liste mi
  // basılacak. Yalnız kurulumda okunur — sonrası efektin işi.
  const expectServer = useRef(storage.read(SERVER_BACKED_KEY) === '1')

  const [records, setRecords] = useState(() => (expectServer.current ? EMPTY : store.list()))
  const [loading, setLoading] = useState(() => expectServer.current)

  // Taşıma tek sefer koşar. Efekt yeniden çalışsa bile (dil değişimi, yeniden
  // render) ikinci kez POST atılmaz.
  const migratingRef = useRef(false)

  const fetchServer = useCallback(async () => {
    const res = await api.get(RECORDS_PATH)
    if (!res.ok) return null
    return (res.data?.records ?? []).map(fromDto).filter(Boolean)
  }, [api])

  useEffect(() => {
    // Oturum durumu henüz belli değil: elimizdeki gösterimi bozmadan beklenir.
    // Bayrak varsa liste boş ve `loading` açık duruyor, yoksa yerel liste.
    if (authLoading) return undefined

    if (!onServer) {
      // Oturum yok ya da kapandı: yerel listeye dönülür (sunucudaki kayıtlar
      // orada durur) ve bayrak silinir — bir sonraki açılış yereli anında bassın.
      storage.remove(SERVER_BACKED_KEY)
      expectServer.current = false
      migratingRef.current = false
      setRecords(store.list())
      setLoading(false)
      return undefined
    }

    // Oturum var: bir daha ilk boyamada yerel liste basılmasın.
    storage.write(SERVER_BACKED_KEY, '1')

    let cancelled = false
    setLoading(true)

    ;(async () => {
      const serverRecords = await fetchServer()
      if (cancelled) return

      if (serverRecords === null) {
        // Liste alınamadı (ağ/oturum): ekran boş liste yerine yereli gösterir,
        // kullanıcı en azından kendi cihazındaki kayıtları görür.
        setRecords(store.list())
        setLoading(false)
        return
      }

      const local = store.list()
      const alreadyMigrated = readMigrated(storage).includes(userId)

      if (alreadyMigrated || local.length === 0 || migratingRef.current) {
        setRecords(serverRecords)
        setLoading(false)
        return
      }

      migratingRef.current = true
      const taken = new Set(serverRecords.map((rec) => recordId(rec.name)))
      const uploaded = []

      for (const rec of local) {
        // Hesapta aynı adlı kayıt varsa dokunulmaz.
        if (taken.has(recordId(rec.name))) continue
        // Sıralı gönderilir: sunucudaki kayıt sayısı sınırı (50) yarış hâlinde
        // farklı sonuçlar vermesin.
        // eslint-disable-next-line no-await-in-loop
        const res = await api.post(RECORDS_PATH, {
          name: rec.name,
          schemaVersion: SCHEMA_VERSION,
          dataJson: JSON.stringify(rec),
        })
        if (res.ok) {
          const saved = fromDto(res.data)
          if (saved) uploaded.push(saved)
        }
        // Başarısız kopyalama sessizce atlanır ve bayrak yine de konur: taşıma
        // her açılışta yeniden denenirse kullanıcı sınıra takıldığında her
        // girişte aynı isteği tekrar tekrar gönderirdi.
      }

      if (cancelled) return
      markMigrated(storage, userId)
      setRecords([...serverRecords, ...uploaded])
      setLoading(false)
    })()

    return () => { cancelled = true }
  }, [authLoading, onServer, userId, api, store, storage, fetchServer])

  // Depolama hiç yoksa (gizli sekme, kapalı site verisi) yerel mod çalışmaz;
  // sunucu modunda böyle bir kısıt yok.
  const available = onServer || storage !== nullStorage

  const save = useCallback(async (record) => {
    if (!onServer) {
      const res = store.save(record)
      if (!res.error) setRecords(store.list())
      return res
    }

    // Doğrulama her iki yolda da saf katmanda ve ÖNCE yapılır: geçersiz zarf
    // için ağa çıkmanın anlamı yok, hata da aynı şekilde dönmeli.
    const check = validateRecord(record)
    if (check.error) return check

    const res = await api.post(RECORDS_PATH, {
      name: check.record.name,
      schemaVersion: SCHEMA_VERSION,
      dataJson: JSON.stringify(check.record),
    })
    if (!res.ok) return toStoreError(res)

    const saved = fromDto(res.data) ?? { ...check.record, id: res.data.id }
    setRecords((prev) => [...prev.filter((rec) => rec.id !== saved.id
      && recordId(rec.name) !== recordId(saved.name)), saved]
      .sort((a, b) => a.name.localeCompare(b.name, 'tr')))
    return { record: saved }
  }, [onServer, store, api])

  const remove = useCallback(async (id) => {
    if (!onServer) {
      const res = store.remove(id)
      if (!res.error) setRecords(store.list())
      return res
    }

    const res = await api.del(`${RECORDS_PATH}/${encodeURIComponent(id)}`)
    if (!res.ok) return toStoreError(res)

    setRecords((prev) => prev.filter((rec) => rec.id !== id))
    return { ok: true }
  }, [onServer, store, api])

  return { records: records ?? EMPTY, available, loading, onServer, save, remove }
}
