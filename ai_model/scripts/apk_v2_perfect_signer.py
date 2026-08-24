import os
import io
import zlib
import struct
import hashlib
import zipfile
import datetime
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes, serialization
from cryptography import x509
from cryptography.x509.oid import NameOID

def fix_dex_checksums(dex_bytes: bytes) -> bytes:
    sha1 = hashlib.sha1(dex_bytes[32:]).digest()
    dex_bytes = dex_bytes[:12] + sha1 + dex_bytes[32:]
    adler = zlib.adler32(dex_bytes[12:]) & 0xffffffff
    dex_bytes = dex_bytes[:8] + struct.pack('<I', adler) + dex_bytes[12:]
    return dex_bytes

def generate_cert_and_key():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, "US"),
        x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "California"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Android"),
        x509.NameAttribute(NameOID.COMMON_NAME, "Android Debug"),
    ])
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(private_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1))
        .not_valid_after(datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=3650))
        .sign(private_key, hashes.SHA256())
    )
    cert_der = cert.public_bytes(serialization.Encoding.DER)
    pub_der = private_key.public_key().public_bytes(
        serialization.Encoding.DER,
        serialization.PublicFormat.SubjectPublicKeyInfo
    )
    return private_key, cert_der, pub_der

def patch_and_sign_v2(input_apk_path, output_apk_path):
    # 1. Custom 4KB zip builder
    entries = []
    with zipfile.ZipFile(input_apk_path, 'r') as zin:
        for item in zin.infolist():
            if item.filename.startswith('META-INF/'):
                continue
            data = zin.read(item.filename)
            if item.filename == 'classes8.dex':
                d = bytearray(data)
                for off in [30580, 30750, 32196]:
                    if d[off+2:off+4] == b'\x7b\x01':
                        d[off+2:off+4] = b'\x77\x01'
                data = fix_dex_checksums(bytes(d))
                print('[+] Patched classes8.dex: Dark Red (CriticalRed) Active Box!')
            entries.append((item.filename, data, item.compress_type))

    # Write aligned ZIP
    zip_bytes = bytearray()
    cd_entries = []

    for name, data, ctype in entries:
        local_hdr_off = len(zip_bytes)
        name_bytes = name.encode('utf-8')
        crc = zlib.crc32(data) & 0xffffffff
        uncomp_size = len(data)

        # 4-byte align 32-bit resources, and 4096-byte align uncompressed .so files
        alignment = 4096 if (ctype == zipfile.ZIP_STORED and name.endswith('.so')) else 4
        
        # Calculate padding needed in local header extra field
        header_len = 30 + len(name_bytes)
        data_off = local_hdr_off + header_len
        padding_len = (alignment - (data_off % alignment)) % alignment
        extra_field = b'\x00' * padding_len

        if ctype == zipfile.ZIP_DEFLATED:
            # Deflate data
            comp_obj = zlib.compressobj(zlib.Z_DEFAULT_COMPRESSION, zlib.DEFLATED, -15)
            comp_data = comp_obj.compress(data) + comp_obj.flush()
            comp_size = len(comp_data)
        else:
            comp_data = data
            comp_size = uncomp_size

        # Local File Header
        local_hdr = struct.pack(
            '<IHHHHHIIIHH',
            0x04034b50, 20, 0, ctype, 0, 0,
            crc, comp_size, uncomp_size,
            len(name_bytes), len(extra_field)
        )
        zip_bytes.extend(local_hdr + name_bytes + extra_field + comp_data)

        # Record Central Directory entry (without padding in extra field)
        cd_entries.append((
            name_bytes, ctype, crc, comp_size, uncomp_size, local_hdr_off
        ))

    cd_offset = len(zip_bytes)
    for name_bytes, ctype, crc, comp_size, uncomp_size, local_hdr_off in cd_entries:
        cd_hdr = struct.pack(
            '<IHHHHHHIIIHHHHHII',
            0x02014b50, 20, 20, 0, ctype, 0, 0,
            crc, comp_size, uncomp_size,
            len(name_bytes), 0, 0, 0, 0, 0,
            local_hdr_off
        )
        zip_bytes.extend(cd_hdr + name_bytes)

    cd_size = len(zip_bytes) - cd_offset

    # End of Central Directory
    eocd = struct.pack(
        '<IHHHHIIH',
        0x06054b50, 0, 0,
        len(cd_entries), len(cd_entries),
        cd_size, cd_offset, 0
    )
    eocd_pos = len(zip_bytes)
    zip_bytes.extend(eocd)

    content_before_cd = zip_bytes[:cd_offset]
    cd_bytes = zip_bytes[cd_offset:cd_offset + cd_size]

    private_key, cert_der, pub_der = generate_cert_and_key()
    sig_algo = 0x0101
    chunk_size = 1048576

    eocd_for_hash = bytearray(zip_bytes[eocd_pos:])
    struct.pack_into('<I', eocd_for_hash, 16, cd_offset)

    chunks = []
    for sec in [content_before_cd, cd_bytes, eocd_for_hash]:
        for i in range(0, len(sec), chunk_size):
            chunk = sec[i:i + chunk_size]
            prefix = b'\xa5' + struct.pack('<I', len(chunk))
            chunks.append(hashlib.sha256(prefix + chunk).digest())

    root_digest = hashlib.sha256(b'\x5a' + struct.pack('<I', len(chunks)) + b''.join(chunks)).digest()

    digest_data = struct.pack('<I', sig_algo) + struct.pack('<I', len(root_digest)) + root_digest
    digest_lp = struct.pack('<I', len(digest_data)) + digest_data
    digests_seq = struct.pack('<I', len(digest_lp)) + digest_lp

    cert_lp = struct.pack('<I', len(cert_der)) + cert_der
    certs_seq = struct.pack('<I', len(cert_lp)) + cert_lp

    attrs_seq = struct.pack('<I', 0)
    signed_data = digests_seq + certs_seq + attrs_seq
    signed_data_lp = struct.pack('<I', len(signed_data)) + signed_data

    sig = private_key.sign(
        signed_data,
        padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=32),
        hashes.SHA256()
    )
    sig_data = struct.pack('<I', sig_algo) + struct.pack('<I', len(sig)) + sig
    sig_lp = struct.pack('<I', len(sig_data)) + sig_data
    signatures_seq = struct.pack('<I', len(sig_lp)) + sig_lp

    pub_key_lp = struct.pack('<I', len(pub_der)) + pub_der

    signer_data = signed_data_lp + signatures_seq + pub_key_lp
    signer_lp = struct.pack('<I', len(signer_data)) + signer_data

    signers_seq = struct.pack('<I', len(signer_lp)) + signer_lp

    v2_id = 0x7109871a
    pair_value = struct.pack('<I', v2_id) + signers_seq
    id_pair = struct.pack('<Q', len(pair_value)) + pair_value

    magic = b'APK Sig Block 42'
    total_block_size = len(id_pair) + 8 + 16

    signing_block = (
        struct.pack('<Q', total_block_size) +
        id_pair +
        struct.pack('<Q', total_block_size) +
        magic
    )

    final_new_cd_offset = cd_offset + len(signing_block)
    final_eocd = bytearray(zip_bytes[eocd_pos:])
    struct.pack_into('<I', final_eocd, 16, final_new_cd_offset)

    final_apk = content_before_cd + signing_block + cd_bytes + final_eocd
    with open(output_apk_path, 'wb') as f:
        f.write(final_apk)
    print(f'[+] Successfully generated 4KB-aligned v2 APK: {output_apk_path}')

if __name__ == '__main__':
    patch_and_sign_v2('app-debug.apk', 'app-debug-red-v2.apk')
