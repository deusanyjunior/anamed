import json, urllib.request, time, os

SRC = r"c:\Users\deusa\OneDrive\Documents\anamed\src\data\embriologia\fases.json"
DEST_DIR = r"c:\Users\deusa\OneDrive\Documents\anamed\public\assets\embriologia\fases"
LOCAL_PREFIX = "/assets/embriologia/fases"
DELAY = 5

with open(SRC, encoding="utf-8") as f:
    data = json.load(f)

seen = {}
for item in data["itens"]:
    for img in item.get("Imagens", []):
        url = img["url"]
        if url.startswith("http") and url not in seen:
            filename = url.split("/Special:FilePath/")[-1]
            seen[url] = filename

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

updated = False
for item in data["itens"]:
    for img in item.get("Imagens", []):
        old_url = img["url"]
        if not old_url.startswith("http"):
            continue
        filename = old_url.split("/Special:FilePath/")[-1]
        img["Copyright"]["urlOriginal"] = old_url
        img["url"] = f"{LOCAL_PREFIX}/{filename}"
        updated = True

if updated:
    with open(SRC, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("\nJSON atualizado com sucesso.")
else:
    print("\nJSON ja estava atualizado.")
