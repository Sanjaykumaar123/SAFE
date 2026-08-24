import zipfile
import re

apk_path = "app-debug.apk"
with zipfile.ZipFile(apk_path, "r") as z:
    for name in z.namelist():
        if name.endswith(".dex"):
            data = z.read(name)
            
            # Search for Retrofit annotation strings (like /detect, /predict, /hazards, etc.)
            idx = 0
            while True:
                idx = data.find(b"Lcom/safepath/ai/data/api/AiServiceApi;", idx)
                if idx == -1:
                    break
                print(f"\n--- Found AiServiceApi in {name} at offset {idx} ---")
                chunk = data[idx:idx+1500]
                strings = re.findall(rb"[\x20-\x7e]{3,60}", chunk)
                for s in strings:
                    print("  ", s.decode("latin1", errors="ignore"))
                idx += 30

            idx = 0
            while True:
                idx = data.find(b"Lcom/safepath/ai/data/api/NetworkClient;", idx)
                if idx == -1:
                    break
                print(f"\n--- Found NetworkClient in {name} at offset {idx} ---")
                chunk = data[idx:idx+1500]
                strings = re.findall(rb"[\x20-\x7e]{3,60}", chunk)
                for s in strings:
                    print("  ", s.decode("latin1", errors="ignore"))
                idx += 30
