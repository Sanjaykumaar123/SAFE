import os
import sys
import urllib.request
import zipfile
import subprocess
import shutil
import time

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS_DIR = os.path.join(BASE_DIR, "tools")
PLATFORM_TOOLS_DIR = os.path.join(TOOLS_DIR, "platform-tools")
ADB_PATH = os.path.join(PLATFORM_TOOLS_DIR, "adb.exe")
APK_PATH = os.path.join(BASE_DIR, "app-debug.apk")
PACKAGE_NAME = "com.safepath.ai"

def ensure_adb():
    if os.path.exists(ADB_PATH):
        return ADB_PATH
    
    os.makedirs(TOOLS_DIR, exist_ok=True)
    zip_url = "https://dl.google.com/android/repository/platform-tools-latest-windows.zip"
    zip_dest = os.path.join(TOOLS_DIR, "platform-tools.zip")
    
    print("[*] Downloading Google Android Platform-Tools (modern ADB)...")
    urllib.request.urlretrieve(zip_url, zip_dest)
    
    print("[*] Extracting platform-tools...")
    with zipfile.ZipFile(zip_dest, "r") as zip_ref:
        zip_ref.extractall(TOOLS_DIR)
    
    if os.path.exists(zip_dest):
        os.remove(zip_dest)
        
    print(f"[+] ADB installed successfully at: {ADB_PATH}")
    return ADB_PATH

def run_adb(cmd_args):
    adb = ensure_adb()
    full_cmd = [adb] + cmd_args
    res = subprocess.run(full_cmd, capture_output=True, text=True)
    return res.returncode, res.stdout.strip(), res.stderr.strip()

def check_device():
    ret, out, err = run_adb(["devices", "-l"])
    lines = out.split("\n")
    devices = []
    for line in lines[1:]:
        line = line.strip()
        if not line:
            continue
        parts = line.split()
        dev_id = parts[0]
        state = parts[1] if len(parts) > 1 else "unknown"
        devices.append((dev_id, state, line))
    return devices

def main():
    print("=" * 60)
    print(" 📱 SafePath AI Mobile Connection & Launcher Helper")
    print("=" * 60)
    
    adb = ensure_adb()
    code, out, _ = run_adb(["version"])
    print(f"[*] {out.splitlines()[0] if out else 'ADB ready'}")
    
    # Restart ADB server fresh
    run_adb(["kill-server"])
    time.sleep(1)
    run_adb(["start-server"])
    
    devices = check_device()
    print(f"\n[*] Scanning connected USB devices...")
    
    if not devices:
        print("\n❌ [NO USB DEVICE DETECTED BY ADB]")
        print("\n👉 To enable ADB connection on your Android phone:")
        print("   1. Open 'Settings' on your phone.")
        print("   2. Go to 'About Phone' -> tap 'Build Number' 7 times until Developer Mode is unlocked.")
        print("   3. Go back to 'Settings' -> 'System' (or 'Additional Settings') -> 'Developer Options'.")
        print("   4. Turn ON 'USB Debugging'.")
        print("   5. When the prompt appears on your phone screen: 'Allow USB debugging?', check 'Always allow' and tap 'OK' / 'Allow'.")
        print("   6. Set USB mode in notifications to 'File Transfer' / 'MTP'.")
        return False
        
    for dev_id, state, line in devices:
        print(f" - Device ID: {dev_id} | State: {state}")
        
        if state == "unauthorized":
            print("\n⚠️ [DEVICE UNAUTHORIZED]")
            print("👉 Check your phone screen now! A popup 'Allow USB debugging from this computer?' is waiting.")
            print("   Please check 'Always allow from this computer' and tap 'Allow' / 'OK'.")
            return False
            
        elif state == "device":
            print("\n✅ [DEVICE CONNECTED & AUTHORIZED]")
            print("[*] Setting up USB port forwarding (TCP 8000 -> 8000)...")
            r_code, r_out, r_err = run_adb(["reverse", "tcp:8000", "tcp:8000"])
            if r_code == 0:
                print("    [+] Port forwarding active! (Phone can talk to http://localhost:8000 via USB)")
            else:
                print(f"    [!] Port forwarding notice: {r_err}")
                
            # Check if app is installed
            _, pkg_list, _ = run_adb(["shell", "pm", "list", "packages", PACKAGE_NAME])
            if PACKAGE_NAME not in pkg_list:
                print(f"[*] App '{PACKAGE_NAME}' is not installed on the phone. Installing '{APK_PATH}'...")
                i_code, i_out, i_err = run_adb(["install", "-r", APK_PATH])
                print(f"    Installation output: {i_out} {i_err}")
            else:
                print(f"[*] App '{PACKAGE_NAME}' is already installed.")
                # Update if APK exists
                print(f"[*] Re-installing / updating app APK...")
                i_code, i_out, i_err = run_adb(["install", "-r", "-d", APK_PATH])
                print(f"    Update output: {i_out}")
                
            print(f"\n🚀 Launching SafePath AI on phone...")
            # Try to launch MainActivity
            l_code, l_out, l_err = run_adb(["shell", "monkey", "-p", PACKAGE_NAME, "-c", "android.intent.category.LAUNCHER", "1"])
            print(f"    App launch status: {l_out.splitlines()[-1] if l_out else 'Started'}")
            print("\n🎉 The app has been launched on your mobile screen!")
            return True

if __name__ == "__main__":
    main()
