import zipfile
import re

apk_path = "app-debug.apk"
with zipfile.ZipFile(apk_path, "r") as z:
    for name in z.namelist():
        if name.endswith(".dex"):
            d = z.read(name)
            matches = re.findall(rb"[A-Za-z0-9_]{3,35}\([a-zA-Z0-9_]+=", d)
            for m in set(matches):
                # find end of toString snippet
                idx = d.find(m)
                snippet = d[idx:idx+250]
                # extract printable string
                s = ""
                for b in snippet:
                    if 32 <= b <= 126:
                        s += chr(b)
                    elif b == 0:
                        break
                if any(k in s for k in ['Dto', 'User', 'Hazard', 'Route', 'Work', 'Token', 'Ai', 'Detection', 'Login']):
                    print(f"[{name}] {s}")
