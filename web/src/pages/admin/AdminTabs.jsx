// Kullanıcılar/Günlük sekme geçişi — yönetim panelinin iki ekranı arasında.
// `LangLink`, dolayısıyla AYRI adres (rota), sayfanın iç durumu değil: geri/
// ileri tuşu çalışsın ve bağlantı paylaşılabilsin diye.
//
// `.admin-tabs` kendi sınıfı: metnin altında akan accent çizgili ("underline
// tab") bir desen, `.lang-switch`in hap biçimli dil düğmeleriyle görsel
// dili paylaşmıyor — CSS dördü tema dosyasında tanımlı (CLAUDE.md: "Ekrana
// özel CSS yazma", ortak sınıf olarak tema dosyalarında kalmalı).
//
// Kendi çerçeve metnini `useLang()`den DOĞRUDAN okur — LangLink'le aynı
// istisna gerekçesi: iki ekranda BİREBİR aynı iki etiket, prop olarak
// geçirmek aynı sözlüğü ikiye kopyalamak olurdu.
import LangLink from '../../components/LangLink'
import { useLang } from '../../hooks/useLang'
import { pick } from '../../lib/i18n'

const NAV_LABEL = { tr: 'Yönetim sekmeleri', en: 'Administration tabs' }
const LABELS = {
  users: { tr: 'Kullanıcılar', en: 'Users' },
  audit: { tr: 'Günlük', en: 'Log' },
  logs: { tr: 'Loglar', en: 'Logs' },
}

export default function AdminTabs({ active }) {
  const { lang } = useLang()
  return (
    <nav className="admin-tabs" aria-label={pick(NAV_LABEL, lang)}>
      <LangLink to="/yonetim" aria-current={active === 'users' ? 'page' : undefined}>
        {pick(LABELS.users, lang)}
      </LangLink>
      <LangLink to="/yonetim/gunluk" aria-current={active === 'audit' ? 'page' : undefined}>
        {pick(LABELS.audit, lang)}
      </LangLink>
      <LangLink to="/yonetim/loglar" aria-current={active === 'logs' ? 'page' : undefined}>
        {pick(LABELS.logs, lang)}
      </LangLink>
    </nav>
  )
}
