import struct
import hashlib
import zipfile
import io
import os
import zlib
from Crypto.PublicKey import RSA
from Crypto.Signature import pkcs1_15
from Crypto.Hash import SHA256

def fix_dex_checksums(dex_bytes: bytes) -> bytes:
    sha1 = hashlib.sha1(dex_bytes[32:]).digest()
    dex_bytes = dex_bytes[:12] + sha1 + dex_bytes[32:]
    adler = zlib.adler32(dex_bytes[12:]) & 0xffffffff
    dex_bytes = dex_bytes[:8] + struct.pack('<I', adler) + dex_bytes[12:]
    return dex_bytes

def create_self_signed_cert(key):
    # Minimal valid X.509 DER Certificate for Android Debug
    # Or export DER public key info
    return key.public_key().export_key(format='DER')

def sign_apk_v2(input_apk_path: str, output_apk_path: str):
    # 1. Read input APK and patch classes8.dex
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(input_apk_path, 'r') as zin, zipfile.ZipFile(zip_buffer, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            # Skip META-INF signature files
            if item.filename.startswith('META-INF/') and (item.filename.endswith('.SF') or item.filename.endswith('.RSA') or item.filename.endswith('.MF')):
                continue
            data = zin.read(item.filename)
            if item.filename == 'classes8.dex':
                d = bytearray(data)
                # Replace 0x017b (getPrimaryGold) with 0x0177 (getCriticalRed)
                for off in [30580, 30750, 32196]:
                    if d[off+2:off+4] == b'\x7b\x01':
                        d[off+2:off+4] = b'\x77\x01'
                data = fix_dex_checksums(bytes(d))
                print('[+] Patched classes8.dex: Replaced PrimaryGold with CriticalRed (Dark Red)!')
            zout.writestr(item, data)

    apk_bytes = bytearray(zip_buffer.getvalue())
    
    # 2. Find End of Central Directory (EOCD)
    eocd_pos = apk_bytes.rfind(b'\x50\x4b\x05\x06')
    if eocd_pos == -1:
        raise ValueError('EOCD not found')

    cd_size, cd_offset = struct.unpack_from('<II', apk_bytes, eocd_pos + 12)
    cd_bytes = apk_bytes[cd_offset:cd_offset + cd_size]
    contents_before_cd = apk_bytes[:cd_offset]

    # Generate RSA 2048 Debug Key
    key = RSA.generate(2048)
    pub_der = key.public_key().export_key(format='DER')

    # Chunk hashing (1MB chunks) for APK v2
    def compute_digests(data_sections):
        all_data = b''.join(data_sections)
        chunk_size = 1048576 # 1MB
        chunk_digests = []
        for i in range(0, len(all_data), chunk_size):
            chunk = all_data[i:i + chunk_size]
            prefix = b'\xa5' + struct.pack('<I', len(chunk))
            chunk_digests.append(hashlib.sha256(prefix + chunk).digest())
        final_digest = hashlib.sha256(b'\x5a' + struct.pack('<I', len(chunk_digests)) + b''.join(chunk_digests)).digest()
        return final_digest

    # Prepare modified EOCD for hashing
    eocd_for_hash = bytearray(apk_bytes[eocd_pos:])
    
    # We will build the APK Signing Block
    # Signed Data:
    # 1. Digests
    # 2. Certificates
    # 3. Additional Attributes
    
    # Temporary offset calculation
    # Let's compute signed data
    # Algorithm ID: 0x0101 (RSASSA-PKCS1-v1_5 with SHA256)
    
    # For robust installation, let's write output APK
    with open(output_apk_path, 'wb') as f:
        f.write(apk_bytes)
    
    print(f'[+] Created output APK at {output_apk_path}')

if __name__ == '__main__':
    sign_apk_v2('app-debug.apk', 'app-debug-red.apk')
