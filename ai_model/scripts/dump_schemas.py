import zipfile
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

apk_path = "app-debug.apk"
with zipfile.ZipFile(apk_path, "r") as z:
    d = z.read("classes14.dex")
    string_ids_size = int.from_bytes(d[0x38:0x3c], 'little')
    string_ids_off = int.from_bytes(d[0x3c:0x40], 'little')
    strings = []
    for i in range(string_ids_size):
        str_off = int.from_bytes(d[string_ids_off + i*4 : string_ids_off + i*4 + 4], 'little')
        pos = str_off
        length = 0
        shift = 0
        while True:
            byte = d[pos]
            pos += 1
            length |= (byte & 0x7f) << shift
            if (byte & 0x80) == 0: break
            shift += 7
        strings.append(d[pos : pos + length].decode('utf-8', errors='replace'))
        
    print("=== DTO toString representations ===")
    for s in strings:
        if any(s.startswith(x) for x in ["TokenResponseDto(", "UserOutDto(", "LoginRequestDto(", "RegisterRequestDto(", "HazardOutDto(", "RouteOptionOutDto(", "RoutePointDto(", "WorkOrderOutDto(", "BoundingBoxDto(", "AiDetectRequestDto(", "AiDetectResponseDto(", "AiDetectionDto(", "AiModelInfoDto(", "CreateAiDetectionRequestDto(", "CreateCitizenReportRequestDto(", "CreateWorkOrderRequestDto(", "UpdateWorkOrderStatusRequestDto(", "HazardStatusUpdateRequestDto(", "UploadImageRequestDto(", "UploadImageResponseDto("]):
            print(s)
            
    print("\n=== All API routes ===")
    for s in strings:
        if s.startswith("/"):
            print(s)
            
    print("\n=== Parameter / Field strings ===")
    for s in strings:
        if s.startswith(", "):
            print(s)
