import zipfile
import re

apk_path = "app-debug.apk"
with zipfile.ZipFile(apk_path, "r") as z:
    for name in z.namelist():
        if name.endswith(".dex"):
            data = z.read(name)
            
            # Find safePathDns
            idx = 0
            while True:
                idx = data.find(b"safePathDns", idx)
                if idx == -1:
                    break
                chunk = data[max(0, idx-100):min(len(data), idx+600)]
                printable = "".join(chr(b) if 32 <= b <= 126 else " " for b in chunk)
                print(f"[{name}] safePathDns:", printable)
                idx += 11
