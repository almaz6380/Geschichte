#!/usr/bin/env python3
"""App Store Connect: Version anlegen, Build zuweisen, zur Prüfung einreichen.

Übernommen aus mahjong-app (scripts/asc-submit.py), angepasst an Weltgeschichte:
Die App wird über die Bundle-ID gefunden, der Schlüssel kommt aus denselben
Secrets wie beim Build (APPSTORE_KEY_ID, APPSTORE_ISSUER_ID, APPSTORE_PRIVATE_KEY).

  python3 scripts/asc-submit.py --status
  python3 scripts/asc-submit.py --version 1.1.0 --notes-file store/whatsnew-1.1.0.json
  python3 scripts/asc-submit.py --version 1.1.0 --notes-file store/whatsnew-1.1.0.json --submit

Ohne --build nimmt das Skript den neuesten verarbeiteten (VALID) Build dieser
Version. Ohne --submit wird nichts geschrieben, das Skript zeigt nur, was es täte.
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

BASE = 'https://api.appstoreconnect.apple.com'
BUNDLE = os.environ.get('ASC_BUNDLE_ID') or 'de.almaz.weltgeschichte'
EDITABLE = {'PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED',
            'INVALID_BINARY', 'WAITING_FOR_EXPORT_COMPLIANCE'}


def token() -> str:
    try:
        import jwt  # pyjwt
    except ImportError:
        sys.exit('Fehlt: pip install pyjwt cryptography')
    raw = os.environ.get('ASC_KEY_P8') or ''
    key_id = (os.environ.get('ASC_KEY_ID') or '').strip()
    issuer = (os.environ.get('ASC_ISSUER_ID') or '').strip()
    if not (raw and key_id and issuer):
        sys.exit('Fehlt: ASC_KEY_ID, ASC_ISSUER_ID oder ASC_KEY_P8.')
    # Wie scripts/check-asc-key.py: Kopf/Fuß und Leerraum weg, sauber neu umbrechen.
    body = re.sub(r'\s+', '', re.sub(r'-----(BEGIN|END) PRIVATE KEY-----', '', raw))
    pem = ('-----BEGIN PRIVATE KEY-----\n'
           + '\n'.join(body[i:i + 64] for i in range(0, len(body), 64))
           + '\n-----END PRIVATE KEY-----\n')
    now = int(time.time())
    return jwt.encode({'iss': issuer, 'iat': now, 'exp': now + 900, 'aud': 'appstoreconnect-v1'},
                      pem, algorithm='ES256', headers={'kid': key_id, 'typ': 'JWT'})


def call(tok, method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    req.add_header('Authorization', f'Bearer {tok}')
    if data:
        req.add_header('Content-Type', 'application/json')
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        sys.exit(f'FEHLER {e.code} bei {method} {path}\n{e.read().decode(errors="replace")}')


def find_app(tok):
    apps = call(tok, 'GET', f'/v1/apps?filter[bundleId]={BUNDLE}')['data']
    if not apps:
        sys.exit(f'Keine App mit Bundle-ID {BUNDLE} in App Store Connect.')
    return apps[0]['id']


def builds_with_version(tok, app_id):
    res = call(tok, 'GET', f'/v1/builds?filter[app]={app_id}&limit=20&sort=-uploadedDate'
                           '&include=preReleaseVersion')
    pre = {p['id']: p['attributes']['version'] for p in res.get('included', [])
           if p['type'] == 'preReleaseVersions'}
    out = []
    for b in res['data']:
        rel = (b.get('relationships', {}).get('preReleaseVersion', {}) or {}).get('data') or {}
        out.append((b, pre.get(rel.get('id'), '?')))
    return out


def status(tok, app_id):
    print(f'App {BUNDLE}: id={app_id}')
    print('\nBuilds (neueste zuerst):')
    for b, v in builds_with_version(tok, app_id)[:10]:
        a = b['attributes']
        print(f'  {v} ({a["version"]})  {a["processingState"]}  hochgeladen {a.get("uploadedDate")}'
              f'  Verschlüsselung={a.get("usesNonExemptEncryption")}')
    print('\nVersionen:')
    for v in call(tok, 'GET', f'/v1/apps/{app_id}/appStoreVersions?limit=10')['data']:
        a = v['attributes']
        print(f'  {a["versionString"]}  {a["appStoreState"]}  id={v["id"]}')
    print('\nEinreichungen:')
    for s in call(tok, 'GET', f'/v1/reviewSubmissions?filter[app]={app_id}&limit=10')['data']:
        a = s['attributes']
        print(f'  {a.get("state")}  eingereicht {a.get("submittedDate")}  id={s["id"]}')


def abschicken(tok, sub_id):
    call(tok, 'PATCH', f'/v1/reviewSubmissions/{sub_id}', {
        'data': {'type': 'reviewSubmissions', 'id': sub_id, 'attributes': {'submitted': True}},
    })
    print(f'✅ eingereicht (reviewSubmission {sub_id})')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--status', action='store_true', help='nur anzeigen')
    ap.add_argument('--version', help='z. B. 1.1.0')
    ap.add_argument('--build', help='Build-Nummer; leer = neuester VALID-Build dieser Version')
    ap.add_argument('--notes-file', help='JSON: {"de-DE": "…", "en-US": "…"}')
    ap.add_argument('--submit', action='store_true', help='wirklich schreiben und einreichen')
    args = ap.parse_args()

    tok = token()
    app_id = find_app(tok)
    if args.status:
        return status(tok, app_id)
    if not (args.version and args.notes_file):
        sys.exit('--version und --notes-file sind nötig (oder --status).')
    with open(args.notes_file, encoding='utf-8') as fh:
        notes = json.load(fh)
    write = args.submit
    tag = '' if write else '  [Probelauf, nichts geschrieben]'

    # --- Build ---
    cands = [(b, v) for b, v in builds_with_version(tok, app_id)
             if v == args.version and (not args.build or b['attributes']['version'] == args.build)]
    if not cands:
        sys.exit(f'Kein Build für Version {args.version} gefunden. Hochgeladen und verarbeitet?')
    valid = [(b, v) for b, v in cands if b['attributes']['processingState'] == 'VALID']
    if not valid:
        sys.exit(f'Build ist noch {cands[0][0]["attributes"]["processingState"]} — später erneut starten.')
    build = valid[0][0]
    print(f'Build {args.version} ({build["attributes"]["version"]}): VALID  id={build["id"]}')
    if build['attributes'].get('usesNonExemptEncryption') is None:
        print('  Exportangabe fehlt — setze „keine Verschlüsselung“ …' + tag)
        if write:
            call(tok, 'PATCH', f'/v1/builds/{build["id"]}', {
                'data': {'type': 'builds', 'id': build['id'],
                         'attributes': {'usesNonExemptEncryption': False}}})

    # --- Version ---
    versions = call(tok, 'GET', f'/v1/apps/{app_id}/appStoreVersions?limit=10')['data']
    erste = not any(v['attributes']['appStoreState'] in ('READY_FOR_SALE', 'REPLACED_WITH_NEW_VERSION',
                                                         'REMOVED_FROM_SALE', 'DEVELOPER_REMOVED_FROM_SALE')
                    for v in versions)
    ver = next((v for v in versions if v['attributes']['versionString'] == args.version), None)
    if not ver:
        # Apple erlaubt nur EINE Version in Arbeit. Gibt es eine editierbare mit
        # anderer Nummer (z. B. eine nie eingereichte 1.0.0), wird sie umbenannt.
        ver = next((v for v in versions if v['attributes']['appStoreState'] in EDITABLE), None)
        if ver:
            alt = ver['attributes']['versionString']
            print(f'Editierbare Version {alt} -> {args.version} umbenennen …{tag}')
            if write:
                call(tok, 'PATCH', f'/v1/appStoreVersions/{ver["id"]}', {
                    'data': {'type': 'appStoreVersions', 'id': ver['id'],
                             'attributes': {'versionString': args.version}}})
        else:
            print(f'Version {args.version} anlegen …{tag}')
            if not write:
                return print('Probelauf endet hier.')
            ver = call(tok, 'POST', '/v1/appStoreVersions', {
                'data': {'type': 'appStoreVersions',
                         'attributes': {'platform': 'IOS', 'versionString': args.version,
                                        'releaseType': 'AFTER_APPROVAL'},
                         'relationships': {'app': {'data': {'type': 'apps', 'id': app_id}}}}})['data']
    st = ver['attributes']['appStoreState']
    print(f'Version {args.version}: {st}  id={ver["id"]}' + ('  (erste Veröffentlichung)' if erste else ''))
    if st == 'READY_FOR_REVIEW':
        subs = call(tok, 'GET', f'/v1/reviewSubmissions?filter[app]={app_id}&limit=10')['data']
        entwurf = next((s for s in subs if s['attributes'].get('state') == 'READY_FOR_REVIEW'), None)
        if not entwurf:
            sys.exit('Version ist READY_FOR_REVIEW, aber kein Entwurf gefunden.')
        print(f'Offener Entwurf {entwurf["id"]} — nur noch abschicken …{tag}')
        if write:
            abschicken(tok, entwurf['id'])
        return
    if st not in EDITABLE:
        sys.exit(f'Version ist {st} und nicht editierbar (schon in Prüfung oder live?).')
    vid = ver['id']

    # --- „Was ist neu" (bei der allerersten Version verbietet Apple das Feld) ---
    locs = call(tok, 'GET', f'/v1/appStoreVersions/{vid}/appStoreVersionLocalizations?limit=50')['data']
    print(f'Sprachen an der Version: {[l["attributes"]["locale"] for l in locs]}')
    if not erste:
        for loc in locs:
            code = loc['attributes']['locale']
            text = notes.get(code) or notes.get(code.split('-')[0]) or notes.get('en-US') or notes['de-DE']
            print(f'  whatsNew {code}: {text[:60]}…{tag}')
            if write:
                call(tok, 'PATCH', f'/v1/appStoreVersionLocalizations/{loc["id"]}', {
                    'data': {'type': 'appStoreVersionLocalizations', 'id': loc['id'],
                             'attributes': {'whatsNew': text}}})

    # --- Build zuweisen ---
    print(f'Build zuweisen …{tag}')
    if write:
        call(tok, 'PATCH', f'/v1/appStoreVersions/{vid}/relationships/build',
             {'data': {'type': 'builds', 'id': build['id']}})

    # --- Einreichen ---
    print('Prüfung einreichen …' + tag)
    if not write:
        return
    subs = call(tok, 'GET', f'/v1/reviewSubmissions?filter[app]={app_id}&limit=10')['data']
    offen = next((x for x in subs if x['attributes'].get('state') == 'UNRESOLVED_ISSUES'), None)
    if offen:
        print(f'Abgelehnte Einreichung {offen["id"]} wird wiederverwendet.')
        for it in call(tok, 'GET', f'/v1/reviewSubmissions/{offen["id"]}/items')['data']:
            if it['attributes'].get('state') in ('REJECTED', 'UNRESOLVED_ISSUES'):
                call(tok, 'PATCH', f'/v1/reviewSubmissionItems/{it["id"]}', {
                    'data': {'type': 'reviewSubmissionItems', 'id': it['id'],
                             'attributes': {'resolved': True}}})
        return abschicken(tok, offen['id'])
    sub = call(tok, 'POST', '/v1/reviewSubmissions', {
        'data': {'type': 'reviewSubmissions', 'attributes': {'platform': 'IOS'},
                 'relationships': {'app': {'data': {'type': 'apps', 'id': app_id}}}}})['data']
    call(tok, 'POST', '/v1/reviewSubmissionItems', {
        'data': {'type': 'reviewSubmissionItems', 'relationships': {
            'reviewSubmission': {'data': {'type': 'reviewSubmissions', 'id': sub['id']}},
            'appStoreVersion': {'data': {'type': 'appStoreVersions', 'id': vid}}}}})
    abschicken(tok, sub['id'])


if __name__ == '__main__':
    main()
