import zipfile

apk_path = "app-debug.apk"
with zipfile.ZipFile(apk_path, "r") as z:
    d = z.read("classes14.dex")
    
    # find where safePathDns class is
    idx = d.find(b"NetworkClient$safePathDns$1")
    if idx != -1:
        chunk = d[max(0, idx-100):min(len(d), idx+1000)]
        print("=== safePathDns byte snippet ===")
        # search for IP strings referenced nearby
        for ip in [b"10.0.2.2", b"10.10.198.146", b"10.197.193.231", b"127.0.0.1", b"192.168.137.1"]:
            if ip in chunk:
                print("Found IP in chunk:", ip)
        # print strings in chunk
        import re
        strs = re.findall(rb"[\x20-\x7e]{3,50}", chunk)
        for s in strs:
            print("  STR:", s.decode('latin1'))
