import zipfile
import re

apk_path = "app-debug.apk"
with zipfile.ZipFile(apk_path, "r") as z:
    for name in z.namelist():
        if name.endswith(".dex"):
            d = z.read(name)
            for dto in ["LoginRequestDto", "TokenResponseDto", "UserOutDto", "RegisterRequestDto", "HazardOutDto", "RouteOptionOutDto", "WorkOrderOutDto", "BoundingBoxDto"]:
                b_dto = dto.encode()
                if b_dto in d:
                    print(f"\n==================== {dto} in {name} ====================")
                    pos = 0
                    while True:
                        idx = d.find(b_dto, pos)
                        if idx == -1: break
                        chunk = d[max(0, idx-50):min(len(d), idx+400)]
                        strings = re.findall(rb"[a-zA-Z0-9_]{2,40}", chunk)
                        print("Context strings:", [s.decode('latin1') for s in strings[:25]])
                        pos = idx + len(b_dto)
