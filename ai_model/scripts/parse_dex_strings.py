import zipfile
import re

apk_path = "app-debug.apk"
with zipfile.ZipFile(apk_path, "r") as z:
    d = z.read("classes14.dex")
    
    # Search for SerializedName annotations or field names in DEX
    # DEX format stores string IDs. Let's find all strings in classes14.dex
    # DEX string table starts at string_ids_off
    magic = d[:8]
    string_ids_size = int.from_bytes(d[0x38:0x3c], 'little')
    string_ids_off = int.from_bytes(d[0x3c:0x40], 'little')
    
    print(f"Total DEX strings: {string_ids_size}")
    strings = []
    for i in range(string_ids_size):
        str_off = int.from_bytes(d[string_ids_off + i*4 : string_ids_off + i*4 + 4], 'little')
        # read uleb128 length
        pos = str_off
        length = 0
        shift = 0
        while True:
            byte = d[pos]
            pos += 1
            length |= (byte & 0x7f) << shift
            if (byte & 0x80) == 0:
                break
            shift += 7
        try:
            s = d[pos : pos + length].decode('utf-8')
            strings.append(s)
        except:
            strings.append(d[pos : pos + length].decode('latin1', errors='ignore'))
            
    print(f"Parsed {len(strings)} strings successfully.")
    
    # Filter for relevant strings
    print("\n--- Serialized Names / Fields ---")
    for s in strings:
        if any(s.startswith(p) for p in ['access_', 'refresh_', 'user_', 'hazard_', 'created_', 'updated_', 'token_', 'is_', 'full_', 'display_', 'device_', 'damage_', 'road_', 'contractor_']):
            print("  *", s)
            
    # Also find all strings in UserOutDto or TokenResponseDto
    print("\n--- User / Token / Auth strings ---")
    for s in strings:
        if any(w in s.lower() for w in ['token', 'user', 'role', 'email', 'name', 'password', 'login', 'register', 'auth', 'citizen', 'collector', 'admin']):
            if len(s) < 40 and not s.startswith(('L', 'androidx', 'com/')):
                print("  >", s)
