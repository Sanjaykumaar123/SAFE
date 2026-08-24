import zipfile
import re

apk_path = "app-debug.apk"
with zipfile.ZipFile(apk_path, "r") as z:
    for name in z.namelist():
        if name.endswith(".dex"):
            d = z.read(name)
            if b"AuthScreen" in d or b"NetworkClient" in d or b"BackendApi" in d:
                print(f"=== {name} ===")
                # find all URLs
                matches = re.findall(rb"https?://[a-zA-Z0-9.:/-]+", d)
                for m in set(matches):
                    print("  URL:", m.decode('latin1'))
                    
                # find strings around login
                for m in re.finditer(rb"(?:login|auth|token|safepath|10\.0\.2\.2)[a-zA-Z0-9_./:-]*", d, re.IGNORECASE):
                    val = m.group().decode('latin1', errors='ignore')
                    if len(val) > 4 and any(x in val for x in ['/', ':', '.', 'demo']):
                        print("  Pattern:", val)
