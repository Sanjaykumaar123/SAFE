import os
import io
import sys
import zlib
import struct
import hashlib
import zipfile
import base64
from datetime import datetime
from Crypto.PublicKey import RSA
from Crypto.Signature import pkcs1_15
from Crypto.Hash import SHA256

def fix_dex_checksums(dex_bytes: bytes) -> bytes:
    sha1 = hashlib.sha1(dex_bytes[32:]).digest()
    dex_bytes = dex_bytes[:12] + sha1 + dex_bytes[32:]
    adler = zlib.adler32(dex_bytes[12:]) & 0xffffffff
    dex_bytes = dex_bytes[:8] + struct.pack('<I', adler) + dex_bytes[12:]
    return dex_bytes

def generate_v1_signed_apk(input_apk_path, output_apk_path):
    # 1. Read input APK
    entries = {}
    with zipfile.ZipFile(input_apk_path, 'r') as zin:
        for item in zin.infolist():
            if item.filename.startswith('META-INF/'):
                continue
            data = zin.read(item.filename)
            if item.filename == 'classes8.dex':
                d = bytearray(data)
                # Patch getPrimaryGold (0x017b) -> getCriticalRed (0x0177)
                for off in [30580, 30750, 32196]:
                    if d[off+2:off+4] == b'\x7b\x01':
                        d[off+2:off+4] = b'\x77\x01'
                data = fix_dex_checksums(bytes(d))
                print('[+] Patched classes8.dex: Swapped Gold -> Critical Dark Red!')
            entries[item.filename] = data

    # 2. Build MANIFEST.MF
    manifest_lines = [b'Manifest-Version: 1.0', b'Created-By: 1.0 (Android)']
    for filename in sorted(entries.keys()):
        digest = base64.b64encode(hashlib.sha256(entries[filename]).digest())
        manifest_lines.append(f'Name: {filename}'.encode('utf-8'))
        manifest_lines.append(b'SHA-256-Digest: ' + digest)
        manifest_lines.append(b'')
    manifest_content = b'\r\n'.join(manifest_lines) + b'\r\n'

    # 3. Build CERT.SF
    manifest_digest = base64.b64encode(hashlib.sha256(manifest_content).digest())
    sf_lines = [
        b'Signature-Version: 1.0',
        b'Created-By: 1.0 (Android)',
        b'SHA-256-Digest-Manifest: ' + manifest_digest
    ]
    for filename in sorted(entries.keys()):
        # digest of the 3-line section in MANIFEST.MF
        file_digest = base64.b64encode(hashlib.sha256(entries[filename]).digest())
        section = f'Name: {filename}\r\nSHA-256-Digest: {file_digest.decode()}\r\n\r\n'.encode('utf-8')
        sec_digest = base64.b64encode(hashlib.sha256(section).digest())
        sf_lines.append(f'Name: {filename}'.encode('utf-8'))
        sf_lines.append(b'SHA-256-Digest: ' + sec_digest)
        sf_lines.append(b'')
    sf_content = b'\r\n'.join(sf_lines) + b'\r\n'

    # 4. Generate RSA Key & Self-Signed PKCS#7 / Certificate Block
    # For android debug, we can extract original CERT.RSA or construct PKCS#7 block
    # Let's read original CERT.RSA from app-debug.apk if present
    original_rsa = None
    with zipfile.ZipFile(input_apk_path, 'r') as zin:
        for name in zin.namelist():
            if name.startswith('META-INF/') and (name.endswith('.RSA') or name.endswith('.DSA') or name.endswith('.EC')):
                original_rsa = zin.read(name)
                print(f'[+] Found original signing cert in {name}')
                break

    # Write output APK
    with zipfile.ZipFile(output_apk_path, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
        # Add files in deterministic order
        zout.writestr('META-INF/MANIFEST.MF', manifest_content)
        zout.writestr('META-INF/CERT.SF', sf_content)
        if original_rsa:
            zout.writestr('META-INF/CERT.RSA', original_rsa)
        for filename in sorted(entries.keys()):
            zout.writestr(filename, entries[filename])

    print(f'[+] Successfully built {output_apk_path}')

if __name__ == '__main__':
    generate_v1_signed_apk('app-debug.apk', 'app-debug-red.apk')
