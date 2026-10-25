#!/usr/bin/env python3
"""Übernimmt fertige Sprachpakete translate/store-<l>.json in:
store/store-texte.json, store/whatsnew-1.2.0.json, iOS <lproj>/InfoPlist.strings (+ pbxproj,
Info.plist CFBundleLocalizations) und Android res/values-<l>/strings.xml. Idempotent."""
import json, os, re
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LANGS = {'fr': ('fr-FR', 'fr', 'fr'), 'es': ('es-ES', 'es', 'es'), 'it': ('it-IT', 'it', 'it'),
         'pt': ('pt-BR', 'pt-BR', 'pt'), 'ru': ('ru-RU', 'ru', 'ru'), 'ja': ('ja-JP', 'ja', 'ja'),
         'zh': ('zh-CN', 'zh-Hans', 'zh'), 'ko': ('ko-KR', 'ko', 'ko'), 'tr': ('tr-TR', 'tr', 'tr'),
         'pl': ('pl-PL', 'pl', 'pl'), 'nl': ('nl-NL', 'nl', 'nl'), 'id': ('id', 'id', 'in'), 'ar': ('ar-SA', 'ar', 'ar')}
FIXED = {'de': ('Weltgeschichte', 'Deine Zustimmung erlaubt uns, dir passendere Werbung zu zeigen. Die App bleibt so oder so kostenlos.'),
         'en': ('World History', 'Your permission lets us show you more relevant ads. The app stays free either way.')}
texte_p = f'{R}/store/store-texte.json'; wn_p = f'{R}/store/whatsnew-' + json.load(open(f'{R}/package.json'))['version'] + '.json'
texte = json.load(open(texte_p)); wn = json.load(open(wn_p))
native = {'de': ('de', 'de', FIXED['de']), 'en': ('en', 'en', FIXED['en'])}
for l, (key, lproj, android) in LANGS.items():
    p = f'{R}/translate/store-{l}.json'
    if not os.path.exists(p):
        continue
    t = json.load(open(p))
    texte[key] = {f: t[f] for f in ('name', 'subtitle', 'play_title', 'keywords', 'short', 'promo', 'description', 'feature')}
    wn[key] = t['whatsnew']
    native[l] = (lproj, android, (t['display_name'], t['att']))
    print('übernommen:', l)
for p, d in ((texte_p, texte), (wn_p, wn)):
    with open(p, 'w') as fh:
        json.dump(d, fh, ensure_ascii=False, indent=2); fh.write('\n')

def esc(s): return s.replace('\\', '\\\\').replace('"', '\\"')
pbx_p = f'{R}/ios/App/App.xcodeproj/project.pbxproj'; pbx = open(pbx_p).read()
plist_p = f'{R}/ios/App/App/Info.plist'; plist = open(plist_p).read()
for l, (lproj, android, (name, att)) in native.items():
    os.makedirs(f'{R}/ios/App/App/{lproj}.lproj', exist_ok=True)
    with open(f'{R}/ios/App/App/{lproj}.lproj/InfoPlist.strings', 'w') as fh:
        fh.write('/* App-Name unter dem Symbol und Text der iOS-Tracking-Abfrage (js/ads.js) */\n'
                 f'"CFBundleDisplayName" = "{esc(name)}";\n"NSUserTrackingUsageDescription" = "{esc(att)}";\n')
    ref = 'A1D0AD0130A00001' + format(abs(hash(lproj)) % 10**8, '08d')
    if f'path = {lproj}.lproj/InfoPlist.strings' not in pbx:
        pbx = pbx.replace('/* End PBXFileReference section */',
            f'\t\t{ref} /* {lproj} */ = {{isa = PBXFileReference; lastKnownFileType = text.plist.strings; name = {lproj}; path = {lproj}.lproj/InfoPlist.strings; sourceTree = "<group>"; }};\n/* End PBXFileReference section */')
        pbx = pbx.replace('\t\t\t\tA1D0AD0130A0000100000004 /* en */,\n', f'\t\t\t\tA1D0AD0130A0000100000004 /* en */,\n\t\t\t\t{ref} /* {lproj} */,\n')
    region = f'"{lproj}"' if '-' in lproj else lproj
    if f'\t\t\t\t{region},\n' not in pbx.split('knownRegions = (')[1].split(');')[0]:
        pbx = pbx.replace('\t\t\tknownRegions = (\n', f'\t\t\tknownRegions = (\n\t\t\t\t{region},\n', 1)
    if f'<string>{lproj}</string>' not in plist.split('CFBundleLocalizations')[1].split('</array>')[0]:
        plist = plist.replace('<key>CFBundleLocalizations</key>\n\t<array>\n', f'<key>CFBundleLocalizations</key>\n\t<array>\n\t\t<string>{lproj}</string>\n', 1)
    d = f'{R}/android/app/src/main/res/values-{android}'
    os.makedirs(d, exist_ok=True)
    xn = name.replace('&', '&amp;').replace("'", "\\'")
    with open(f'{d}/strings.xml', 'w') as fh:
        fh.write(f"<?xml version='1.0' encoding='utf-8'?>\n<resources>\n    <string name=\"app_name\">{xn}</string>\n    <string name=\"title_activity_main\">{xn}</string>\n</resources>\n")
open(pbx_p, 'w').write(pbx); open(plist_p, 'w').write(plist)
print('nativ:', ', '.join(native))
