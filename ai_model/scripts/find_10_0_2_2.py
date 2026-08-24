import zipfile

apk_path = "app-debug.apk"
with zipfile.ZipFile(apk_path, "r") as z:
    d = z.read("classes14.dex")
    
    # Let's inspect where b"10.0.2.2" occurs
    pos = 0
    while True:
        idx = d.find(b"10.0.2.2", pos)
        if idx == -1: break
        print(f"Occurrence at {idx}:", d[max(0, idx-20):min(len(d), idx+30)])
        pos = idx + 8
