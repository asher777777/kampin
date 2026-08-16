import os

filepath = r'c:\Users\ovt57\Desktop\community-generator-web\src\app\dashboard\crm\ContactModal.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('setMode("view");', '')
content = content.replace('setMode("edit");', '')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed setMode")
