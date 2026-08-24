import zipfile
import re

apk_path = "app-debug.apk"
with zipfile.ZipFile(apk_path, "r") as z:
    all_data = b""
    for name in z.namelist():
        if name.endswith(".dex"):
            all_data += z.read(name)

    print("Total DEX bytes:", len(all_data))

    # Search for URLs
    url_pattern = rb"https?://[a-zA-Z0-9.-]+(?::[0-9]+)?(?:/[a-zA-Z0-9_./%-]*)?"
    urls = set(re.findall(url_pattern, all_data))
    print("\n--- Detected URLs in APK ---")
    for u in sorted(urls):
        try:
            print(" -", u.decode("utf-8"))
        except:
            pass

    # Search for specific SafePath / AI endpoints
    print("\n--- Search for API endpoints / paths ---")
    endpoints = set(re.findall(rb"/[a-zA-Z0-9_/-]{3,40}", all_data))
    for ep in sorted(endpoints):
        decoded = ep.decode("latin1", errors="ignore")
        if any(k in decoded.lower() for k in ["predict", "pothole", "detect", "model", "damage", "api", "v1", "infer"]):
            print(" -", decoded)

    # Search for class names related to model or camera
    print("\n--- Search for SafePath class names ---")
    classes = set(re.findall(rb"Lcom/[a-zA-Z0-9_/]+;", all_data))
    for c in sorted(classes):
        decoded = c.decode("latin1", errors="ignore")
        if any(k in decoded.lower() for k in ["safepath", "pothole", "camera", "detect", "vision", "ai", "model", "network"]):
            print(" -", decoded)
