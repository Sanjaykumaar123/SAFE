import zipfile
import re

apk_path = "app-debug.apk"
with zipfile.ZipFile(apk_path, "r") as z:
    for name in z.namelist():
        if name.endswith(".dex"):
            d = z.read(name)
            if b"BACKEND_BASE_URL" in d or b"AI_SERVICE_BASE_URL" in d or b"10.0.2.2" in d:
                print(f"=== {name} ===")
                # find all occurrences
                for term in [b"BACKEND_BASE_URL", b"AI_SERVICE_BASE_URL", b"BASE_URL", b"10.0.2.2"]:
                    idx = 0
                    while True:
                        idx = d.find(term, idx)
                        if idx == -1: break
                        chunk = d[max(0, idx-50):min(len(d), idx+200)]
                        print(f"[{term.decode()}]", "".join(chr(b) if 32 <= b <= 126 else "." for b in chunk))
                        idx += len(term)
