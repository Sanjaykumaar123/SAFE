import zipfile
import re

apk_path = "app-debug.apk"
with zipfile.ZipFile(apk_path, "r") as z:
    d = z.read("classes14.dex")
    # find all http:// strings
    urls = re.findall(rb"http://[^\x00\"\'\s]+", d)
    print("All HTTP URLs in classes14.dex:")
    for u in set(urls):
        print(" ", u.decode('latin1'))
