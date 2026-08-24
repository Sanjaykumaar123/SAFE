import zipfile

apk_path = "app-debug.apk"
with zipfile.ZipFile(apk_path, "r") as z:
    d = z.read("classes14.dex")

    class_defs_off = int.from_bytes(d[0x64:0x68], 'little')
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

    # Class 28
    off = class_defs_off + 28 * 32
    class_data_off = int.from_bytes(d[off+24:off+28], 'little')
    
    pos = [class_data_off]
    def read_uleb():
        res = 0
        shift = 0
        while True:
            b = d[pos[0]]
            pos[0] += 1
            res |= (b & 0x7f) << shift
            if (b & 0x80) == 0: break
            shift += 7
        return res
        
    s_fields = read_uleb()
    i_fields = read_uleb()
    d_methods = read_uleb()
    v_methods = read_uleb()
    
    for i in range(d_methods):
        m_idx = read_uleb()
        flags = read_uleb()
        code_off = read_uleb()
        
    for i in range(v_methods):
        m_idx = read_uleb()
        flags = read_uleb()
        code_off = read_uleb()
        print(f"Virtual Method {i}: code_off={code_off}")
        if code_off > 0:
            insns_size = int.from_bytes(d[code_off+12:code_off+16], 'little')
            insns = d[code_off+16 : code_off+16 + insns_size*2]
            
            p = 0
            while p < len(insns):
                op = insns[p]
                if op == 0x1a: # const-string vAA, string@BBBB
                    str_idx = int.from_bytes(insns[p+2:p+4], 'little')
                    print(f"  offset {p} [const-string]: [{str_idx}] -> {get_str(str_idx)}")
                    p += 4
                elif op == 0x1b: # const-string/jumbo
                    str_idx = int.from_bytes(insns[p+2:p+6], 'little')
                    print(f"  offset {p} [const-string/jumbo]: [{str_idx}] -> {get_str(str_idx)}")
                    p += 6
                else:
                    p += 2
