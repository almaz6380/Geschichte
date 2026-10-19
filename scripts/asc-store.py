#!/usr/bin/env python3
"""App Store Connect: Sprachen, Screenshots, Standardsprache und Länder.

  python3 scripts/asc-store.py --status
  python3 scripts/asc-store.py --sprachen --screenshots --standardsprache en-US --alle-laender
  ... dasselbe mit --schreiben, sonst Probelauf (es wird nichts geändert)

--sprachen        legt an der bearbeitbaren Version jede Sprache aus store/store-texte.json an
                  (Beschreibung, Keywords, Werbetext, Support-/Marketing-URL) und am App-Info
                  Name + Untertitel. Vorhandene Sprachen bekommen Keywords und Untertitel
                  neu; den Namen schickt das Skript bei vorhandenen Sprachen NIE mit — Apple
                  prüft ihn sonst neu gegen alle Konten und antwortet 409 (Mahjong, 11.8.2026).
--screenshots     lädt je Sprache die Bilder aus docs/screenshots/<sprache>/ hoch
                  (iPhone 6,9" und iPad 13"). Sprachen mit vorhandenen Bildern werden
                  übersprungen, außer mit --ersetzen. Apple erbt Screenshots NICHT: Ohne
                  Bilder je Sprache lässt sich die Version nicht einreichen.
--standardsprache primaryLocale der App (z. B. en-US). Die Sprache muss schon existieren.
--alle-laender    macht die App in allen Ländern verfügbar, in denen Apple sie anbietet.

Metadaten sind nur änderbar, solange keine Prüfung läuft (sonst 409).
Schlüssel wie asc-submit.py: ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8.
"""
import argparse
import hashlib
import importlib.util
import json
import os
import sys
import urllib.error
import urllib.request

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
WEB = 'https://almaz6380.github.io/Geschichte/'

spec = importlib.util.spec_from_file_location('asc_submit', os.path.join(HIER, 'asc-submit.py'))
sub = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sub)

# Sprachschlüssel in store/store-texte.json → Apple-Locales. Apple führt Italienisch, Russisch
# und Japanisch ohne Länderteil („it“, „ru“, „ja“), Chinesisch als „zh-Hans“; Spanisch gibt es für Spanien und Lateinamerika getrennt.
APPLE = {
    'de-DE': ['de-DE'], 'en-US': ['en-US', 'en-GB'], 'fr-FR': ['fr-FR'],
    'es-ES': ['es-ES', 'es-MX'], 'it-IT': ['it'], 'pt-BR': ['pt-BR'],
    'ru-RU': ['ru'], 'ja-JP': ['ja'], 'zh-CN': ['zh-Hans'],
}
# Screenshot-Ordner je Quellsprache (de liegt direkt in docs/screenshots/).
SHOT_DIR = {'de-DE': '', 'en-US': 'en', 'fr-FR': 'fr', 'es-ES': 'es', 'it-IT': 'it', 'pt-BR': 'pt',
            'ru-RU': 'ru', 'ja-JP': 'ja', 'zh-CN': 'zh'}
SETS = {'APP_IPHONE_67': 'iphone-69', 'APP_IPAD_PRO_3GEN_129': 'ipad-13'}


def lade_texte():
    with open(os.path.join(REPO, 'store', 'store-texte.json'), encoding='utf-8') as fh:
        quelle = {k: v for k, v in json.load(fh).items() if not k.startswith('_')}
    out = {}
    for key, t in quelle.items():
        for loc in APPLE.get(key, [key]):
            out[loc] = (key, t)
    return out


def call(tok, method, url, body=None, raw=None, headers=None):
    voll = url if url.startswith('http') else sub.BASE + url
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    req = urllib.request.Request(voll, data=data, method=method)
    if not url.startswith('http'):
        req.add_header('Authorization', f'Bearer {tok}')
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    if body is not None and raw is None:
        req.add_header('Content-Type', 'application/json')
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            b = r.read()
            return json.loads(b) if b and b[:1] in (b'{', b'[') else {}
    except urllib.error.HTTPError as e:
        b = e.read().decode(errors='replace')
        try:
            errs = json.loads(b)['errors']
            msg = '; '.join(f"{x.get('title')}: {x.get('detail')}" for x in errs)
        except Exception:
            msg = b[:400]
        raise RuntimeError(f'HTTP {e.code} bei {method} {url[:80]} — {msg}') from None


def alle(tok, url):
    out = []
    while url:
        r = call(tok, 'GET', url)
        out += r.get('data', [])
        url = (r.get('links') or {}).get('next')
    return out


def bearbeitbare_version(tok, app_id):
    vers = call(tok, 'GET', f'/v1/apps/{app_id}/appStoreVersions?limit=10')['data']
    v = next((v for v in vers if v['attributes']['appStoreState'] in sub.EDITABLE), None)
    if not v:
        zust = ', '.join(f"{x['attributes']['versionString']}={x['attributes']['appStoreState']}" for x in vers)
        sys.exit(f'Keine bearbeitbare Version ({zust}). Erst Version anlegen (asc-submit.py ohne --submit legt sie nicht an) oder Prüfung abwarten.')
    return v


def app_info(tok, app_id):
    infos = call(tok, 'GET', f'/v1/apps/{app_id}/appInfos')['data']
    # Bearbeitbar ist der App-Info-Datensatz, der nicht der veröffentlichte ist.
    return next((i for i in infos if i['attributes'].get('appStoreState') not in ('READY_FOR_SALE',)), infos[0])


def status(tok, app_id):
    app = call(tok, 'GET', f'/v1/apps/{app_id}')['data']
    print('primaryLocale:', app['attributes'].get('primaryLocale'))
    vers = call(tok, 'GET', f'/v1/apps/{app_id}/appStoreVersions?limit=5')['data']
    for v in vers:
        locs = call(tok, 'GET', f"/v1/appStoreVersions/{v['id']}/appStoreVersionLocalizations?limit=50")['data']
        print(f"Version {v['attributes']['versionString']} {v['attributes']['appStoreState']}: "
              + ', '.join(sorted(l['attributes']['locale'] for l in locs)))
    info = app_info(tok, app_id)
    il = call(tok, 'GET', f"/v1/appInfos/{info['id']}/appInfoLocalizations?limit=50")['data']
    print('App-Info:', ', '.join(f"{l['attributes']['locale']}={l['attributes'].get('name')!r}" for l in il))
    try:
        av = call(tok, 'GET', f'/v1/apps/{app_id}/appAvailabilityV2')['data']
        terr = alle(tok, f"/v2/appAvailabilities/{av['id']}/territoryAvailabilities?limit=200")
        an = sum(1 for t in terr if t['attributes'].get('available'))
        print(f'Länder: {an} von {len(terr)} verfügbar')
    except RuntimeError as e:
        print('Länder: nicht lesbar —', e)


def sprachen(tok, app_id, schreiben):
    texte = lade_texte()
    v = bearbeitbare_version(tok, app_id)
    print(f"Version {v['attributes']['versionString']} ({v['attributes']['appStoreState']})")
    locs = {l['attributes']['locale']: l for l in
            call(tok, 'GET', f"/v1/appStoreVersions/{v['id']}/appStoreVersionLocalizations?limit=50")['data']}
    for loc, (_, t) in texte.items():
        attrs = {'description': t['description'], 'keywords': t['keywords'], 'promotionalText': t['promo'],
                 'supportUrl': WEB + 'impressum.html', 'marketingUrl': WEB}
        if loc in locs:
            print(f'  [{loc}] Version: aktualisieren')
            if schreiben:
                call(tok, 'PATCH', f"/v1/appStoreVersionLocalizations/{locs[loc]['id']}",
                     {'data': {'type': 'appStoreVersionLocalizations', 'id': locs[loc]['id'],
                               'attributes': {k: attrs[k] for k in ('description', 'keywords', 'promotionalText')}}})
        else:
            print(f'  [{loc}] Version: anlegen')
            if schreiben:
                call(tok, 'POST', '/v1/appStoreVersionLocalizations',
                     {'data': {'type': 'appStoreVersionLocalizations', 'attributes': {'locale': loc, **attrs},
                               'relationships': {'appStoreVersion': {'data': {'type': 'appStoreVersions', 'id': v['id']}}}}})
    info = app_info(tok, app_id)
    il = {l['attributes']['locale']: l for l in
          call(tok, 'GET', f"/v1/appInfos/{info['id']}/appInfoLocalizations?limit=50")['data']}
    for loc, (_, t) in texte.items():
        priv = {'privacyPolicyUrl': WEB + ('datenschutz.html' if loc == 'de-DE' else 'privacy.html')}
        if loc in il:
            print(f'  [{loc}] App-Info: Untertitel {t["subtitle"]!r}')
            if schreiben:
                call(tok, 'PATCH', f"/v1/appInfoLocalizations/{il[loc]['id']}",
                     {'data': {'type': 'appInfoLocalizations', 'id': il[loc]['id'],
                               'attributes': {'subtitle': t['subtitle'], **priv}}})
        else:
            print(f'  [{loc}] App-Info: anlegen ({t["name"]!r} / {t["subtitle"]!r})')
            if schreiben:
                call(tok, 'POST', '/v1/appInfoLocalizations',
                     {'data': {'type': 'appInfoLocalizations',
                               'attributes': {'locale': loc, 'name': t['name'], 'subtitle': t['subtitle'], **priv},
                               'relationships': {'appInfo': {'data': {'type': 'appInfos', 'id': info['id']}}}}})


def screenshots(tok, app_id, schreiben, ersetzen):
    texte = lade_texte()
    v = bearbeitbare_version(tok, app_id)
    locs = call(tok, 'GET', f"/v1/appStoreVersions/{v['id']}/appStoreVersionLocalizations?limit=50")['data']
    for l in locs:
        loc = l['attributes']['locale']
        if loc not in texte:
            continue
        quelle = os.path.join(REPO, 'docs', 'screenshots', SHOT_DIR[texte[loc][0]])
        sets = call(tok, 'GET', f"/v1/appStoreVersionLocalizations/{l['id']}/appScreenshotSets?limit=20")['data']
        bestand = {s['attributes']['screenshotDisplayType']: (s['id'], call(tok, 'GET', f"/v1/appScreenshotSets/{s['id']}/appScreenshots?limit=20")['data']) for s in sets}
        schon = sum(len(b) for _, b in bestand.values())
        if schon and not ersetzen:
            print(f'  [{loc}] hat {schon} Screenshots — übersprungen')
            continue
        for typ, ordner in SETS.items():
            pfad = os.path.join(quelle, ordner)
            bilder = sorted(f for f in os.listdir(pfad) if f.endswith('.png')) if os.path.isdir(pfad) else []
            if not bilder:
                sys.exit(f'Keine Bilder in {pfad} — erst SHOT_LANG=… node scripts/make-screenshots.mjs')
            print(f'  [{loc}] {typ}: {len(bilder)} Bilder aus {os.path.relpath(pfad, REPO)}')
            if not schreiben:
                continue
            sid, alt = bestand.get(typ, (None, []))
            if not sid:
                sid = call(tok, 'POST', '/v1/appScreenshotSets',
                           {'data': {'type': 'appScreenshotSets', 'attributes': {'screenshotDisplayType': typ},
                                     'relationships': {'appStoreVersionLocalization': {'data': {'type': 'appStoreVersionLocalizations', 'id': l['id']}}}}})['data']['id']
            for a in alt:
                call(tok, 'DELETE', f"/v1/appScreenshots/{a['id']}")
            for name in bilder:
                roh = open(os.path.join(pfad, name), 'rb').read()
                r = call(tok, 'POST', '/v1/appScreenshots',
                         {'data': {'type': 'appScreenshots', 'attributes': {'fileName': name, 'fileSize': len(roh)},
                                   'relationships': {'appScreenshotSet': {'data': {'type': 'appScreenshotSets', 'id': sid}}}}})
                shot = r['data']['id']
                for op in r['data']['attributes']['uploadOperations']:
                    kopf = {h['name']: h['value'] for h in op.get('requestHeaders', [])}
                    teil = roh[op['offset']:op['offset'] + op['length']]
                    call(tok, op['method'], op['url'], raw=teil, headers=kopf)
                call(tok, 'PATCH', f'/v1/appScreenshots/{shot}',
                     {'data': {'type': 'appScreenshots', 'id': shot,
                               'attributes': {'uploaded': True, 'sourceFileChecksum': hashlib.md5(roh).hexdigest()}}})


def standardsprache(tok, app_id, ziel, schreiben):
    app = call(tok, 'GET', f'/v1/apps/{app_id}')['data']
    alt = app['attributes'].get('primaryLocale')
    print(f'Standardsprache: {alt} → {ziel}')
    if alt != ziel and schreiben:
        call(tok, 'PATCH', f'/v1/apps/{app_id}',
             {'data': {'type': 'apps', 'id': app_id, 'attributes': {'primaryLocale': ziel}}})


def alle_laender(tok, app_id, schreiben):
    av = call(tok, 'GET', f'/v1/apps/{app_id}/appAvailabilityV2')['data']
    terr = alle(tok, f"/v2/appAvailabilities/{av['id']}/territoryAvailabilities?limit=200&include=territory")
    aus = [t for t in terr if not t['attributes'].get('available')]
    print(f'Länder: {len(terr) - len(aus)} von {len(terr)} verfügbar, {len(aus)} werden eingeschaltet')
    if schreiben:
        for t in aus:
            try:
                call(tok, 'PATCH', f"/v1/territoryAvailabilities/{t['id']}",
                     {'data': {'type': 'territoryAvailabilities', 'id': t['id'], 'attributes': {'available': True}}})
            except RuntimeError as e:
                # Manche Länder verlangen eigene Unterlagen (z. B. China: Lizenz) — die bleiben aus.
                print(f"  {t['id'][:24]}…: {e}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--status', action='store_true')
    ap.add_argument('--sprachen', action='store_true')
    ap.add_argument('--screenshots', action='store_true')
    ap.add_argument('--ersetzen', action='store_true')
    ap.add_argument('--standardsprache')
    ap.add_argument('--alle-laender', action='store_true')
    ap.add_argument('--schreiben', action='store_true')
    a = ap.parse_args()
    tok = sub.token()
    app_id = sub.find_app(tok)
    if not a.schreiben and not a.status:
        print('PROBELAUF — es wird nichts geändert (--schreiben fehlt)\n')
    if a.status:
        status(tok, app_id)
    if a.sprachen:
        sprachen(tok, app_id, a.schreiben)
    if a.screenshots:
        screenshots(tok, app_id, a.schreiben, a.ersetzen)
    if a.standardsprache:
        standardsprache(tok, app_id, a.standardsprache, a.schreiben)
    if a.alle_laender:
        alle_laender(tok, app_id, a.schreiben)


if __name__ == '__main__':
    main()
