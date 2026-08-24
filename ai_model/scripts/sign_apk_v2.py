import os
import io
import zlib
import struct
import hashlib
import zipfile
from Crypto.PublicKey import RSA
from Crypto.Signature import pkcs1_15
from Crypto.Hash import SHA256

def fix_dex_checksums(dex_bytes: bytes) -> bytes:
    sha1 = hashlib.sha1(dex_bytes[32:]).digest()
    dex_bytes = dex_bytes[:12] + sha1 + dex_bytes[32:]
    adler = zlib.adler32(dex_bytes[12:]) & 0xffffffff
    dex_bytes = dex_bytes[:8] + struct.pack('<I', adler) + dex_bytes[12:]
    return dex_bytes

def build_v2_signing_block(content_before_cd: bytes, cd_bytes: bytes, eocd_bytes: bytes):
    # RSA 2048 key
    key = RSA.generate(2048)
    pub_der = key.public_key().export_key(format='DER')

    # Algorithm ID 0x0101 = RSASSA-PKCS1-v1_5 with SHA-256
    sig_algo = 0x0101

    # 1MB Chunk Digests over section 1, section 2 (CD), section 3 (EOCD with offset updated)
    chunk_size = 1048576
    all_chunks = []
    
    # We will compute digests over (content_before_cd, cd_bytes, eocd_for_hash)
    for section in [content_before_cd, cd_bytes, eocd_bytes]:
        for i in range(0, len(section), chunk_size):
            chunk = section[i:i + chunk_size]
            prefix = b'\xa5' + struct.pack('<I', len(chunk))
            all_chunks.append(hashlib.sha256(prefix + chunk).digest())
    
    # Final 0x0101 digest
    content_digest = hashlib.sha256(b'\x5a' + struct.pack('<I', len(all_chunks)) + b''.join(all_chunks)).digest()

    # Digest sequence
    digest_elem = struct.pack('<I', sig_algo) + struct.pack('<I', len(content_digest)) + content_digest
    digest_seq = struct.pack('<I', len(digest_elem)) + digest_elem

    # Certificate sequence
    cert_seq = struct.pack('<I', len(pub_der)) + pub_der
    certs_seq = struct.pack('<I', len(cert_seq)) + cert_seq

    # Additional attributes (empty)
    attrs_seq = struct.pack('<I', 0)

    # Signed Data
    signed_data = (
        struct.pack('<I', len(digest_seq)) + digest_seq +
        struct.pack('<I', len(certs_seq)) + certs_seq +
        struct.pack('<I', len(attrs_seq)) + attrs_seq
    )
    signed_data_seq = struct.pack('<I', len(signed_data)) + signed_data

    # Signature
    h = SHA256.new(signed_data)
    sig_bytes = pkcs1_15.new(key).sign(h)
    
    sig_elem = struct.pack('<I', sig_algo) + struct.pack('<I', len(sig_bytes)) + sig_bytes
    signatures_seq = struct.pack('<I', len(sig_elem)) + sig_elem

    # Signer
    signer_data = (
        struct.pack('<I', len(signed_data)) + signed_data +
        struct.pack('<I', len(signatures_seq)) + signatures_seq +
        struct.pack('<I', len(pub_der)) + pub_der
    )
    signers_seq = struct.pack('<I', len(signer_data)) + signer_data

    # V2 Scheme Block (ID = 0x7109871a)
    v2_id = 0x7109871a
    v2_block_data = struct.pack('<I', len(signers_seq)) + signers_seq
    id_value_pair = struct.pack('<Q', len(v2_block_data) + 4) + struct.pack('<I', v2_id) + v2_block_data

    # Magic 16 bytes: "APK Sig Block 42"
    magic = b'APK Sig Block 42'
    block_size = len(id_value_pair) + 8 + 16 # total size including size header and magic
    
    signing_block = (
        struct.pack('<Q', block_size) +
        id_value_pair +
        struct.pack('<Q', block_size) +
        magic
    )
    return signing_block

def patch_and_sign_apk(input_apk_path, output_apk_path):
    # 1. Unpack & patch classes8.dex
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(input_apk_path, 'r') as zin, zipfile.ZipFile(zip_buffer, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == 'classes8.dex':
                d = bytearray(data)
                for off in [30580, 30750, 32196]:
                    if d[off+2:off+4] == b'\x7b\x01':
                        d[off+2:off+4] = b'\x77\x01'
                data = fix_dex_checksums(bytes(d))
                print('[+] Patched classes8.dex to Dark Red (CriticalRed)!')
            zout.writestr(item, data)

    apk_raw = bytearray(zip_buffer.getvalue())
    eocd_pos = apk_raw.rfind(b'\x50\x4b\x05\x06')
    cd_size, cd_offset = struct.unpack_from('<II', apk_raw, eocd_pos + 12)
    
    content_before_cd = apk_raw[:cd_offset]
    cd_bytes = apk_raw[cd_offset:cd_offset + cd_size]
    
    # EOCD with new offset
    # First estimate signing block size
    temp_eocd = bytearray(apk_raw[eocd_pos:])
    signing_block = build_v2_signing_block(content_before_cd, cd_bytes, temp_eocd)
    
    new_cd_offset = cd_offset + len(signing_block)
    final_eocd = bytearray(apk_raw[eocd_pos:])
    struct.pack_into('<I', final_eocd, 16, new_cd_offset)
    
    final_apk = content_before_cd + signing_block + cd_bytes + final_eocd
    with open(output_apk_path, 'wb') as f:
        f.write(final_apk)
    print(f'[+] Created v2-signed APK: {output_apk_path}')

if __name__ == '__main__':
    patch_and_sign_apk('app-debug.apk', 'app-debug-red-v2.apk')
