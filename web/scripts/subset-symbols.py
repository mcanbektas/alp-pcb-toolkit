#!/usr/bin/env python3
"""Sembol alt kümesi üreteci — `build-fonts.mjs --symbols` bunu çağırır.

Neden ayrı bir betik: mühendislik sembolleri (→, ≈, √, ✓, alt/üst simgeler)
Google'ın yayınladığı `latin` / `latin-ext` / `greek` alt kümelerinin HİÇBİRİNDE
yok. Glif ailenin tam `ttf` dosyasında duruyor ama alt küme dosyasına girmemiş,
yani aralığı genişletmek işe yaramaz — kendi alt kümemizi kesmek gerekiyor.
Kesme işi `fontTools`un işidir; ağdan indirme ve CSS üretimi `build-fonts.mjs`de
kalır, bu betik yalnız dosya cerrahisi yapar.

Girdi (stdin, JSON):
    {"outDir": "...", "codepoints": [8594, ...], "jobs": [
       {"name": "ibm-plex-sans-symbols-400-normal.woff2", "family": "IBM Plex Sans",
        "source": "/tmp/…ttf", "instance": {"wght": 400, "wdth": 100}}, …]}

Çıktı (stdout, JSON): her dosya için kaç bayt olduğu ve İÇİNDE GERÇEKTEN olan
kod noktaları. Aile başına kapsama farklı olabilir: Chakra Petch'in charset'i
IBM Plex'ten dar. Beklenip de bulunmayan kod noktası `missing` altında bildirilir
— CSS o karakteri o aileden gelecekmiş gibi göstermesin diye.

Gereksinim: `fontTools` + `brotli` (woff2 yazımı brotli olmadan çalışmaz).
Yalnız font kümesi değiştiğinde gerekir; üretilen `woff2` dosyaları depoda durur.
"""

import json
import sys

try:
    from fontTools.subset import Options, Subsetter
    from fontTools.ttLib import TTFont
    from fontTools.varLib.instancer import instantiateVariableFont
except ImportError as exc:  # pragma: no cover - ortam eksikse anlaşılır dursun
    print(f'fontTools bulunamadı ({exc}). Kurulum: python3 -m pip install --user fonttools brotli',
          file=sys.stderr)
    raise SystemExit(2)

try:
    import brotli  # noqa: F401  (fontTools woff2 yazarken kendisi kullanır)
except ImportError:
    print('brotli bulunamadı — woff2 yazılamaz. Kurulum: python3 -m pip install --user brotli',
          file=sys.stderr)
    raise SystemExit(2)


def subset_one(job, codepoints, out_dir):
    font = TTFont(job['source'])

    # Değişken font (IBM Plex Sans yukarı akışta yalnız böyle yayınlanıyor)
    # istenen ağırlığa sabitlenir: çıktı statik olur, CSS'teki `font-weight`
    # değeri ile birebir eşleşir.
    if job.get('instance'):
        font = instantiateVariableFont(font, job['instance'], inplace=True)

    have = set(font.getBestCmap().keys())
    covered = [cp for cp in codepoints if cp in have]
    missing = [cp for cp in codepoints if cp not in have]

    if not covered:
        font.close()
        return {'name': job['name'], 'bytes': 0, 'covered': [], 'missing': missing,
                'skipped': True}

    options = Options()
    options.flavor = 'woff2'
    # Sembollerde bağlaç/kerning aranmaz; düzen tablolarını atmak dosyayı
    # küçültür ve çizimi değiştirmez.
    options.layout_features = []
    options.name_IDs = ['*']
    options.notdef_outline = False

    subsetter = Subsetter(options=options)
    subsetter.populate(unicodes=covered)
    subsetter.subset(font)

    # Üretim tekrarlanabilir olmalı: `head.modified` varsayılan olarak "şimdi"
    # yazılır ve aynı komut her koşuda farklı bayt üretirdi — `--symbols` de
    # "değişti" diye bildirirdi, gerçek bir değişiklik yokken.
    font.recalcTimestamp = False
    font['head'].modified = font['head'].created

    font.flavor = 'woff2'
    target = f'{out_dir}/{job["name"]}'
    font.save(target)
    font.close()

    with open(target, 'rb') as handle:
        size = len(handle.read())

    return {'name': job['name'], 'family': job['family'], 'bytes': size,
            'covered': covered, 'missing': missing, 'skipped': False}


def main():
    spec = json.load(sys.stdin)
    codepoints = sorted(set(spec['codepoints']))
    files = [subset_one(job, codepoints, spec['outDir']) for job in spec['jobs']]

    # Aile başına kapsama: aynı ailenin bütün ağırlıkları aynı charset'i taşır,
    # yine de kesişim alınır — bir ağırlık ötekinden dar olursa CSS yalancı
    # olmasın.
    families = {}
    for item in files:
        if item['skipped']:
            continue
        family = item['family']
        current = families.get(family)
        families[family] = item['covered'] if current is None \
            else [cp for cp in current if cp in set(item['covered'])]

    json.dump({'files': files, 'families': families}, sys.stdout)


if __name__ == '__main__':
    main()
