import os
import sys
import subprocess
import time

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ADB_PATH = os.path.join(BASE_DIR, "tools", "platform-tools", "adb.exe")
os.environ["ANDROID_ADB_SERVER_PORT"] = "5038"

def run_adb(args):
    cmd = [ADB_PATH] + args
    res = subprocess.run(cmd, capture_output=True, text=True)
    return res.returncode, res.stdout.strip(), res.stderr.strip()

def main():
    print("[*] Starting SafePath Persistent Reverse Bridge Daemon...")
    run_adb(["kill-server"])
    time.sleep(0.5)
    run_adb(["start-server"])
    
    while True:
        # Check attached devices
        _, dev_out, _ = run_adb(["devices"])
        if "device" in dev_out:
            # Re-apply reverse forwardings
            run_adb(["reverse", "tcp:8000", "tcp:8000"])
            run_adb(["reverse", "tcp:8001", "tcp:8001"])
        time.sleep(3)

if __name__ == "__main__":
    main()
