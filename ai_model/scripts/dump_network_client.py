import zipfile
import re

apk_path = "app-debug.apk"
with zipfile.ZipFile(apk_path, "r") as z:
    for name in z.namelist():
        if name.endswith(".dex"):
            data = z.read(name)
            
            # Find occurrences of safepath.backend or localhost or base_url
            for m in re.finditer(rb"(http://safepath\.backend[^\x00\"'\s]+)", data):
                print("Found match in dex:", m.group().decode('ascii', errors='ignore'))
                
            # Search around AiServiceApi or BackendApi strings
            pos = 0
            while True:
                idx = data.find(b"AiServiceApi", pos)
                if idx == -1:
                    break
                snippet = data[max(0, idx - 100):min(len(data), idx + 400)]
                print("\n[AiServiceApi snippet]:")
                printable = "".join(chr(b) if 32 <= b <= 126 else "." for b in snippet)
                print(printable)
                pos = idx + 12

            pos = 0
            while True:
                idx = data.find(b"NetworkClient", pos)
                if idx == -1:
                    break
                snippet = data[max(0, idx - 100):min(len(data), idx + 400)]
                print("\n[NetworkClient snippet]:")
                printable = "".join(chr(b) if 32 <= b <= 126 else "." for b in snippet)
                print(printable)
                pos = idx + 13
