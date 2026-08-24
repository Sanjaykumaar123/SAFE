import zipfile

apk_path = "app-debug.apk"
with zipfile.ZipFile(apk_path, "r") as z:
    d = z.read("classes14.dex")

    # code_off = 28356
    code_off = 28356
    insns_size = int.from_bytes(d[code_off+12:code_off+16], 'little')
    insns = d[code_off+16 : code_off+16 + insns_size*2]
    
    print("Bytecode:", insns[:120].hex())
