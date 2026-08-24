import zipfile
import re

apk_path = "app-debug.apk"
with zipfile.ZipFile(apk_path, "r") as z:
    all_data = b""
    for name in z.namelist():
        if name.endswith(".dex"):
            all_data += z.read(name)

    # Let's search for retrofit HTTP annotations (POST, GET, multipart, etc) and base URLs
    # Search for baseUrl strings
    print("--- Strings containing http/localhost/10.0.2.2/api ---")
    matches = re.findall(rb"https?://[^\x00\"'\s]+", all_data)
    for m in set(matches):
        print("URL:", m.decode("latin1", errors="ignore"))

    # Search for Retrofit route strings
    print("\n--- Retrofit Endpoint strings ---")
    routes = re.findall(rb"(?:api/|v1/|auth/|hazard|detect|predict|upload|citizen|collector)[a-zA-Z0-9_/.-]*", all_data)
    for r in sorted(set(routes)):
        print("Route:", r.decode("latin1", errors="ignore"))

    # Search for fields in AiDetectRequestDto and AiDetectResponseDto
    print("\n--- DTO field names ---")
    words = ["image", "confidence", "bbox", "pothole", "severity", "damage", "class", "label", "boxes", "detections", "mask", "ratio", "score"]
    for w in words:
        found = set(re.findall(rb"[a-zA-Z0-9_]{0,10}" + w.encode() + rb"[a-zA-Z0-9_]{0,10}", all_data))
        safe_found = [f.decode('latin1') for f in found if len(f) < 25 and not f.startswith(('L', 'androidx', 'com/google'))][:8]
        print(f"Field around '{w}':", safe_found)
