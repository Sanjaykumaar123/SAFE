import zipfile

apk_path = "app-debug.apk"
with zipfile.ZipFile(apk_path, "r") as z:
    d = z.read("classes14.dex")

    # Let's inspect class definitions in classes14.dex
    # DEX header: class_defs_size at 0x60, class_defs_off at 0x64
    class_defs_size = int.from_bytes(d[0x60:0x64], 'little')
    class_defs_off = int.from_bytes(d[0x64:0x68], 'little')
    type_ids_off = int.from_bytes(d[0x44:0x48], 'little')
    string_ids_off = int.from_bytes(d[0x3c:0x40], 'little')
    
    def get_str(idx):
        str_off = int.from_bytes(d[string_ids_off + idx*4 : string_ids_off + idx*4 + 4], 'little')
        pos = str_off
        length = 0
        shift = 0
        while True:
            b = d[pos]
            pos += 1
            length |= (b & 0x7f) << shift
            if (b & 0x80) == 0: break
            shift += 7
        return d[pos:pos+length].decode('utf-8', errors='replace')
        
    def get_type_str(type_idx):
        descriptor_idx = int.from_bytes(d[type_ids_off + type_idx*4 : type_ids_off + type_idx*4 + 4], 'little')
        return get_str(descriptor_idx)

    for i in range(class_defs_size):
        off = class_defs_off + i * 32
        class_idx = int.from_bytes(d[off:off+4], 'little')
        class_name = get_type_str(class_idx)
        if "safePathDns" in class_name or "NetworkClient" in class_name:
            print(f"Class [{i}]: {class_name}")
