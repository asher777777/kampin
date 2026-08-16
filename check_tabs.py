with open('old_ContactModal.tsx', 'r', encoding='utf-16') as f:
    text = f.read()
    import re
    ids = re.findall(r'id="(tab-[^"]+)"', text)
    print("Tabs found:")
    for id_ in ids:
        print(id_)
