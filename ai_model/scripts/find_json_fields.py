import zipfile
import re

apk_path = "app-debug.apk"
with zipfile.ZipFile(apk_path, "r") as z:
    for name in z.namelist():
        if name.endswith(".dex"):
            data = z.read(name)
            
            # Find class definitions or Gson/Moshi/Kotlinx serialization strings
            for term in [b"image_base64", b"image", b"bbox", b"boxes", b"confidence", b"severity", b"pothole", b"detections", b"model_name", b"device"]:
                matches = re.finditer(term, data)
                for m in matches:
                    idx = m.start()
                    chunk = data[max(0, idx-50):min(len(data), idx+100)]
                    printable = "".join(chr(b) if 32 <= b <= 126 else " " for b in chunk)
                    if "safepath" in printable or "detect" in printable or "Dto" in printable:
                        print(f"[{name}] {printable.strip()}")
