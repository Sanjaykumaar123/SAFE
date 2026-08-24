import zipfile

apk_path = "app-debug.apk"
with zipfile.ZipFile(apk_path, "r") as z:
    d = z.read("classes14.dex")
    
    for url in [b"http://safepath.backend:8000/", b"http://safepath.backend:8001/"]:
        idx = d.find(url)
        print(f"=== {url.decode()} ===")
        print(d[max(0, idx-100):min(len(d), idx+200)])
