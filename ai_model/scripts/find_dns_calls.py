import zipfile

apk_path = "app-debug.apk"
with zipfile.ZipFile(apk_path, "r") as z:
    d = z.read("classes14.dex")
    
    # search for InetAddress.getAllByName or InetAddress.getByName
    for target in [b"getAllByName", b"getByName"]:
        pos = 0
        while True:
            idx = d.find(target, pos)
            if idx == -1: break
            chunk = d[max(0, idx-100):min(len(d), idx+200)]
            print(f"[{target.decode()}]", "".join(chr(b) if 32 <= b <= 126 else "." for b in chunk))
            pos = idx + len(target)
