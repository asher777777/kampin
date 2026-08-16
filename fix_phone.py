import os

filepath = r'c:\Users\ovt57\Desktop\community-generator-web\src\app\dashboard\crm\ContactModal.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('{phone && (', '{contaPhone && (')
content = content.replace('phone.replace', 'contaPhone.replace')
content = content.replace('tel:${phone}', 'tel:${contaPhone}')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Replaced phone with contaPhone")
