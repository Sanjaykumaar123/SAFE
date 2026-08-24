import zipfile
import re

apk_path = "app-debug.apk"
with zipfile.ZipFile(apk_path, "r") as z:
    all_data = b""
    for name in z.namelist():
        if name.endswith(".dex"):
            all_data += z.read(name)

    # Search for strings around AiServiceApi or NetworkClient
    print("--- Searching for Base URLs & Endpoints ---")
    strings = []
    # Extract null-terminated or length-prefixed ascii strings
    for m in re.finditer(rb"[\x20-\x7e]{4,100}", all_data):
        s = m.group().decode("latin1")
        if any(w in s.lower() for w in ["8000", "8080", "5000", "http", "api", "detect", "predict", "hazard", "pothole", "safepath"]):
            strings.append(s)

    for s in sorted(set(strings)):
        if "http" in s.lower() or "api" in s.lower() or "detect" in s.lower() or "model" in s.lower():
            print("  >", s)
