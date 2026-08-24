import zipfile
import re

apk_path = "app-debug.apk"
with zipfile.ZipFile(apk_path, "r") as z:
    d = z.read("classes14.dex")
    
    # search around safePathDns
    idx = 0
    while True:
        idx = d.find(b"safePathDns", idx)
        if idx == -1: break
        chunk = d[max(0, idx-100):min(len(d), idx+800)]
        print("=== safePathDns chunk ===")
        print("".join(chr(b) if 32 <= b <= 126 else "." for b in chunk))
        idx += 12
