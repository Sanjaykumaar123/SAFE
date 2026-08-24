import os
import subprocess

os.environ['ANDROID_ADB_SERVER_PORT'] = '5038'
adb = r'c:\Users\srira\OneDrive\Desktop\AI model-1\pathole_ai_model\tools\platform-tools\adb.exe'

cmd = "echo 'GET /api/health HTTP/1.1\r\nHost: 127.0.0.1:8000\r\n\r\n' | toybox nc 127.0.0.1 8000"
res = subprocess.run([adb, 'shell', cmd], capture_output=True, text=True)
print("127.0.0.1 test output:\n", res.stdout, res.stderr)
