import sys

with open('src/features/crm/components/CRMFormBuilder.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

placeholder_code = '''                            <div>
                              <label className="block font-semibold mb-1 text-slate-400">טקסט עזר (Placeholder)</label>
                              <input
                                type="text"
                                value={field.placeholder || ""}
                                onChange={(e) => handleFieldChange(idx, { placeholder: e.target.value })}
                                className="w-full bg-[#181818] text-white border border-white/10 rounded-xl p-2.5 outline-none"
                                placeholder="למשל: הכנס את שמך המלא..."
                              />
                            </div>
                            <div>
                              <label className="block font-semibold mb-1 text-slate-400">רוחב השדה בשורה</label>'''

content = content.replace(
    '                            <div>\n                              <label className="block font-semibold mb-1 text-slate-400">רוחב השדה בשורה</label>',
    placeholder_code
)

with open('src/features/crm/components/CRMFormBuilder.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Added placeholder input')
