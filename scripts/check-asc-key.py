#!/usr/bin/env python3
"""Prüft einen App-Store-Connect-API-Schlüssel: normalisiert die .p8-Datei, erzeugt ein JWT (ES256)
und ruft die API auf. Meldet klar, ob Schlüssel-ID, Issuer-ID und privater Schlüssel zusammenpassen.
Aufruf: check-asc-key.py <p8-pfad> <key-id> <issuer-id> [bundle-id]"""
import base64, json, os, re, subprocess, sys, time, urllib.request, urllib.error

p8_path, key_id, issuer_id = sys.argv[1], sys.argv[2].strip(), sys.argv[3].strip()
bundle_id = sys.argv[4].strip() if len(sys.argv) > 4 else None

raw = open(p8_path, encoding="utf-8", errors="replace").read()
body = re.sub(r"-----(BEGIN|END) PRIVATE KEY-----", "", raw)
body = re.sub(r"\s+", "", body)
if not body or not re.fullmatch(r"[A-Za-z0-9+/=]+", body):
    print("FEHLER: APPSTORE_PRIVATE_KEY enthält keinen gültigen Base64-Schlüssel. Bitte den kompletten Inhalt der .p8-Datei kopieren.")
    sys.exit(2)
normalized = "-----BEGIN PRIVATE KEY-----\n" + "\n".join(body[i:i+64] for i in range(0, len(body), 64)) + "\n-----END PRIVATE KEY-----\n"
open(p8_path, "w").write(normalized)

def b64url(b): return base64.urlsafe_b64encode(b).rstrip(b"=").decode()
header = b64url(json.dumps({"alg": "ES256", "kid": key_id, "typ": "JWT"}).encode())
now = int(time.time())
payload = b64url(json.dumps({"iss": issuer_id, "iat": now, "exp": now + 600, "aud": "appstoreconnect-v1"}).encode())
signing_input = f"{header}.{payload}".encode()
try:
    der = subprocess.run(["openssl", "dgst", "-sha256", "-sign", p8_path], input=signing_input, capture_output=True, check=True).stdout
except subprocess.CalledProcessError as e:
    print("FEHLER: Der private Schlüssel ist beschädigt (openssl konnte nicht signieren):", e.stderr.decode().strip())
    sys.exit(2)
# DER (r,s) -> raw 64 Byte
def der_to_raw(d):
    assert d[0] == 0x30
    i = 2
    assert d[i] == 0x02; l = d[i+1]; r = d[i+2:i+2+l]; i += 2 + l
    assert d[i] == 0x02; l = d[i+1]; s = d[i+2:i+2+l]
    return r[-32:].rjust(32, b"\0") + s[-32:].rjust(32, b"\0")
token = f"{header}.{payload}.{b64url(der_to_raw(der))}"

def get(url):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

try:
    apps = get("https://api.appstoreconnect.apple.com/v1/apps?limit=200")
except urllib.error.HTTPError as e:
    detail = e.read().decode(errors="replace")[:300]
    if e.code == 401:
        print("FEHLER: Apple lehnt den Schlüssel ab (401). Prüfen: APPSTORE_KEY_ID und APPSTORE_ISSUER_ID exakt wie in App Store Connect, APPSTORE_PRIVATE_KEY aus genau dieser .p8-Datei.")
    else:
        print(f"FEHLER: App Store Connect antwortet mit {e.code}: {detail}")
    sys.exit(2)

print(f"OK: Schlüssel gültig, Zugriff auf {len(apps.get('data', []))} App(s).")
if bundle_id:
    found = [a for a in apps.get("data", []) if a["attributes"].get("bundleId") == bundle_id]
    if found:
        print(f"OK: App-Eintrag für {bundle_id} vorhanden: „{found[0]['attributes'].get('name')}“")
    else:
        print(f"FEHLER: In App Store Connect gibt es noch keine App mit Bundle-ID {bundle_id}. Bitte anlegen: appstoreconnect.apple.com → Meine Apps → + → Neue App → Plattform iOS, Bundle-ID {bundle_id}, SKU weltgeschichte-1. Danach den Workflow erneut starten.")
    try:
        bids = get(f"https://api.appstoreconnect.apple.com/v1/bundleIds?filter[identifier]={bundle_id}")
        if bids.get("data"):
            print(f"OK: Bundle-ID {bundle_id} ist im Developer-Portal registriert.")
        else:
            print(f"WARNUNG: Bundle-ID {bundle_id} ist im Developer-Portal nicht registriert (wird beim Archivieren automatisch angelegt).")
    except Exception as e:
        print("Hinweis: Bundle-ID-Prüfung nicht möglich:", e)

# Vorhandene Signierzertifikate des Teams auflisten (Apple begrenzt die Anzahl der Distribution-Zertifikate).
try:
    certs = get("https://api.appstoreconnect.apple.com/v1/certificates?limit=200")
    dist = [c for c in certs.get("data", []) if "DISTRIBUTION" in c["attributes"].get("certificateType", "")]
    print(f"INFO: {len(certs.get('data', []))} Zertifikat(e) im Team, davon {len(dist)} Distribution-Zertifikat(e):")
    for c in dist:
        a = c["attributes"]
        print(f"INFO:   {a.get('certificateType')} – {a.get('displayName')} – gültig bis {str(a.get('expirationDate'))[:10]}")
except Exception as e:
    print("Hinweis: Zertifikatsliste nicht abrufbar:", e)
