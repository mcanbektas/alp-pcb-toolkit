// Bileşim kökü (composition root).
//
// Somut bağımlılıklar yalnızca burada birbirine bağlanır. `lib/` altındaki
// modüller soyut portu bilir, hangi uygulamanın kullanıldığını bilmez; arayüz
// katmanı da yalnızca bu hazır örneği kullanır.

import { createProfileStore } from '../lib/dataProfiles'
import { defaultStorage } from '../lib/storage'

export const profileStore = createProfileStore(defaultStorage)
