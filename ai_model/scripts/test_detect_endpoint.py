import urllib.request
import json
import base64

with open('output_preview_1.jpg', 'rb') as f:
    b64 = base64.b64encode(f.read()).decode('utf-8')

for port in [8000, 8001]:
    for key in ['image_base64', 'imageBase64', 'frame_image_base64']:
        payload = json.dumps({key: b64, 'confidence_threshold': 0.20}).encode()
        req = urllib.request.Request(
            f'http://127.0.0.1:{port}/detect',
            data=payload,
            headers={'Content-Type': 'application/json'}
        )
        resp = urllib.request.urlopen(req)
        res = json.loads(resp.read().decode())
        print(f"[+] Port {port} with key {key}: HTTP {resp.status} - {len(res.get('detections', []))} detections - Latency: {res.get('inference_latency_ms')} ms")
        print("    Sample detection payload:", res.get('detections', [])[:1])
