import zipfile
import re

apk_path = "app-debug.apk"
with zipfile.ZipFile(apk_path, "r") as z:
    d = z.read("classes14.dex")
    
    # search around 10.0.2.2 or 127.0.0.1
    idx = 0
    while True:
        idx = d.find(b"10.0.2.2", idx)
        if idx == -1: break
        chunk = d[max(0, idx-100):min(len(d), idx+300)]
        print("=== 10.0.2.2 chunk ===")
        print("".join(chr(b) if 32 <= b <= 126 else "." for b in chunk))
        idx += 8
