import json, urllib.request, time, os

SRC = r"c:\Users\deusa\OneDrive\Documents\anamed\src\data\anatomia\ossos.json"
DEST_DIR = r"c:\Users\deusa\OneDrive\Documents\anamed\public\assets\anatomia\ossos"
DELAY = 30

with open(SRC, encoding="utf-8") as f:
    data = json.load(f)

# Coleta pares (url_original, filename) únicos — usa urlOriginal se disponível
seen = {}
for item in data["itens"]:
    for img in item.get("Imagens", []):
        src_url = img.get("Copyright", {}).get("urlOriginal", "")
        if not src_url.startswith("http"):
            src_url = img["url"]
        if not src_url.startswith("http"):
            continue
        filename = src_url.split("/Special:FilePath/")[-1]
        if src_url not in seen:
            seen[src_url] = filename

total = len(seen)
pending = [(u, f) for u, f in seen.items()
           if not (os.path.exists(os.path.join(DEST_DIR, f)) and os.path.getsize(os.path.join(DEST_DIR, f)) > 2000)]

print(f"Total unicas: {total} | Pendentes: {len(pending)}")

headers = {"User-Agent": "Mozilla/5.0 (anamed-study-app/1.0)"}
for i, (url, filename) in enumerate(pending, 1):
    dest_path = os.path.join(DEST_DIR, filename)
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            content = resp.read()
        with open(dest_path, "wb") as out:
            out.write(content)
        print(f"[{i}/{len(pending)}] OK ({len(content)} bytes): {filename}")
    except Exception as e:
        print(f"[{i}/{len(pending)}] ERRO: {filename} -- {e}")
    if i < len(pending):
        time.sleep(DELAY)

print("\nConcluido.")
