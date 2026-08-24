import zipfile
import re

apk_path = "app-debug.apk"
with zipfile.ZipFile(apk_path, "r") as z:
    for name in z.namelist():
        if name.endswith(".dex"):
            data = z.read(name)
            
            # Check DNS interceptor in NetworkClient
            if b"safePathDns" in data or b"safepath.backend" in data:
                print(f"\n=== Found safePathDns / backend in {name} ===")
                idx = 0
                while True:
                    idx = data.find(b"safepath.backend", idx)
                    if idx == -1:
                        break
                    chunk = data[max(0, idx-100):min(len(data), idx+300)]
                    printable = "".join(chr(b) if 32 <= b <= 126 else " " for b in chunk)
                    print("Match:", printable)
                    idx += 16
