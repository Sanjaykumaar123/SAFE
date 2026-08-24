import zipfile
import re

apk_path = "app-debug.apk"
with zipfile.ZipFile(apk_path, "r") as z:
    d = z.read("classes14.dex")

    # Search for field names of each class
    # Kotlin data classes have generated component1(), component2(), etc., and private final fields
    # Let's search for the Lcom/safepath/ai/data/api/ class descriptors
    for cls in [
        "TokenResponseDto", "UserOutDto", "LoginRequestDto", "RegisterRequestDto",
        "HazardOutDto", "RouteOptionOutDto", "WorkOrderOutDto", "BoundingBoxDto",
        "CreateAiDetectionRequestDto", "CreateCitizenReportRequestDto"
    ]:
        print(f"\n============================== {cls} ==============================")
        idx = 0
        while True:
            idx = d.find(f"Lcom/safepath/ai/data/api/{cls};".encode(), idx)
            if idx == -1: break
            chunk = d[max(0, idx-200):min(len(d), idx+500)]
            words = re.findall(rb"[a-zA-Z_][a-zA-Z0-9_]{1,30}", chunk)
            print("Words near class def:", [w.decode('latin1') for w in words[:30]])
            idx += 20
