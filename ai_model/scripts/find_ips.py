import zipfile
import re

apk_path = "app-debug.apk"
with zipfile.ZipFile(apk_path, "r") as z:
    for name in z.namelist():
        if name.endswith(".dex"):
            data = z.read(name)
            # Find IPs
            ips = re.findall(rb"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b", data)
            if ips:
                print(f"[{name}] Found IPs:", set(i.decode('ascii') for i in ips))
