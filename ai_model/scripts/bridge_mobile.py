import os
import sys
import subprocess
import time
import urllib.request

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ADB_PATH = os.path.join(BASE_DIR, "tools", "platform-tools", "adb.exe")

# Use isolated port 5038 so emulator services do not conflict
os.environ["ANDROID_ADB_SERVER_PORT"] = "5038"

def run_adb(args):
    cmd = [ADB_PATH] + args
    res = subprocess.run(cmd, capture_output=True, text=True)
    return res.returncode, res.stdout.strip(), res.stderr.strip()

def setup_bridge():
    print("[*] Initializing isolated ADB server on port 5038...")
    run_adb(["kill-server"])
    time.sleep(0.5)
    run_adb(["start-server"])
    
    code, out, _ = run_adb(["devices"])
    print("[*] Devices attached:\n", out)
    
    # Establish reverse tunnels
    r1_code, r1_out, r1_err = run_adb(["reverse", "tcp:8000", "tcp:8000"])
    r2_code, r2_out, r2_err = run_adb(["reverse", "tcp:8001", "tcp:8001"])
    print(f"[+] Reverse tunnel 8000: {r1_out or r1_err}")
    print(f"[+] Reverse tunnel 8001: {r2_out or r2_err}")
    
    # Verify tunnel list
    _, l_out, _ = run_adb(["reverse", "--list"])
    print(f"[+] Active reverse tunnels:\n{l_out}")
    
    # Verify local web server is running
    try:
        req = urllib.request.urlopen("http://127.0.0.1:8000/api/health", timeout=3)
        print(f"[+] Local backend reachable on PC: HTTP {req.status}")
    except Exception as e:
        print(f"[!] Warning: Local backend test on port 8000 failed: {e}")

    # Test reverse tunnel from mobile phone to PC
    print("[*] Testing reverse bridge from phone to PC...")
    test_cmd = "echo -e 'GET /api/health HTTP/1.1\\r\\nHost: 127.0.0.1:8000\\r\\n\\r\\n' | toybox nc 127.0.0.1 8000"
    t_code, t_out, t_err = run_adb(["shell", test_cmd])
    if "HTTP/1.1 200" in t_out:
        print("\n🎉 SUCCESS! Mobile phone successfully reached PC backend over USB with HTTP 200 OK!")
        print("Response header snippet:", t_out.splitlines()[0])
        return True
    else:
        print(f"[!] Test from phone result: {t_out} | {t_err}")
        return False

if __name__ == "__main__":
    setup_bridge()
