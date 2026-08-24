import zipfile
import re

apk_path = "app-debug.apk"
with zipfile.ZipFile(apk_path, "r") as z:
    for name in z.namelist():
        if name.endswith(".dex"):
            data = z.read(name)
            
            # Look for AiDetectRequestDto or AiDetectResponseDto fields
            for cls in [b"AiDetectRequestDto", b"AiDetectResponseDto", b"AiDetectionDto", b"AiBoundingBoxDto", b"AiModelInfoDto"]:
                if cls in data:
                    print(f"\n=== Found {cls.decode()} in {name} ===")
                    # print nearby strings
                    idx = data.find(cls)
                    chunk = data[max(0, idx-500):min(len(data), idx+1000)]
                    strings = re.findall(rb"[a-zA-Z0-9_]{2,40}", chunk)
                    print("Tokens:", [s.decode('latin1') for s in strings[:30]])
