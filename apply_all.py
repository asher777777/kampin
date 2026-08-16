import os

filepath = r'c:\Users\ovt57\Desktop\community-generator-web\src\app\dashboard\crm\ContactModal.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update activeTab initial state and remove mode state
content = content.replace(
    '  const [mode, setMode] = useState<"view" | "edit">("view");\n  const [activeTab, setActiveTab] = useState<TabType>("details");',
    '  const [activeTab, setActiveTab] = useState<TabType | "">("");'
)

# 2. Remove setMode calls
content = content.replace('setMode("view");', '')
content = content.replace('setMode("edit");', '')
content = content.replace(
    '                <button\n                  onClick={() => setMode("edit")}',
    '                <button'
)

# 3. Remove the entire view mode block
startViewMatch = '  if (mode === "view" && contact) {'
endViewMatch = '  return (\n    <Modal isOpen={isOpen} onClose={onClose}>\n      <Modal.Content className="max-w-3xl rounded-[2rem] p-8">'
startIdx = content.find(startViewMatch)
endIdx = content.find(endViewMatch)
if endIdx == -1:
    endViewMatch = '  return (\r\n    <Modal isOpen={isOpen} onClose={onClose}>\r\n      <Modal.Content className="max-w-3xl rounded-[2rem] p-8">'
    endIdx = content.find(endViewMatch)

if startIdx != -1 and endIdx != -1:
    content = content[:startIdx] + content[endIdx:]

# 4. Inject handleTabClick before the main return
mainReturnMatch = '  return (\n    <Modal isOpen={isOpen} onClose={onClose}>'
if content.find(mainReturnMatch) == -1:
    mainReturnMatch = '  return (\r\n    <Modal isOpen={isOpen} onClose={onClose}>'

handleTabClickCode = '''  const handleTabClick = (tabName: TabType | string) => {
    if (activeTab === tabName) {
      setActiveTab("" as any);
    } else {
      setActiveTab(tabName as any);
      setTimeout(() => {
        const el = document.getElementById(`tab-${tabName}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  };

''' + mainReturnMatch

content = content.replace(mainReturnMatch, handleTabClickCode)

# 5. Replace Modal.Header
headerOldMatch = '<Modal.Header'
endHeaderMatch = '/>'
startHeaderIdx = content.find(headerOldMatch, content.find('<Modal.Close'))

if startHeaderIdx != -1:
    endHeaderIdx = content.find(endHeaderMatch, startHeaderIdx) + len(endHeaderMatch)
    
    newHeader = '''{isEdit ? (
            <div className="flex flex-col items-center text-center space-y-4 border-b border-white/10 pb-6 mb-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-black shadow-md ${getAvatarBg(contaName)}`}>
                {getInitials(contaName, fM)}
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-black text-white">
                  {contaName} {fM}
                </h3>
              </div>
              <div className="flex justify-center gap-2.5 w-full max-w-sm pt-2">
                <a
                  href={`https://wa.me/${contaPhone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  className="flex-1 py-2 px-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  וואטסאפ
                </a>
                <a
                  href={`tel:${contaPhone}`}
                  className="flex-1 py-2 px-3 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Phone className="w-4 h-4 text-indigo-600" />
                  התקשר
                </a>
              </div>
            </div>
          ) : (
            <Modal.Header 
              title="הוספת איש קשר חדש" 
              description="מלא את שדות החובה להוספת איש קשר חדש למערכת"
            />
          )}'''
    content = content[:startHeaderIdx] + newHeader + content[endHeaderIdx:]

# 6. Remove the top tab navigation
tabNavStart = content.find('            {/* Tab Navigation */}')
tabNavEnd = content.find('          <div className="w-full flex flex-col bg-[#181818] rounded-xl overflow-hidden border border-white/5 shadow-xl mb-4">', tabNavStart)

if tabNavStart != -1 and tabNavEnd != -1:
    content = content[:tabNavStart] + content[tabNavEnd:]

# 7. Fix setActiveTab on init (line 131 roughly)
content = content.replace('setActiveTab("details");', 'setActiveTab("" as any);')

# 8. Add sticky classes and handleTabClick to all accordion buttons
tabs = ["details", "tags", "company", "camp", "events", "timeline", "payments", "userDetails"]

for tab in tabs:
    oldOnClick = f'onClick={{() => setActiveTab(activeTab === "{tab}" ? "" as any : "{tab}")}}'
    newOnClick = f'id="tab-{tab}"\n              onClick={{() => handleTabClick("{tab}")}}'
    content = content.replace(oldOnClick, newOnClick)
    
    oldClass = f'`w-full p-4 hover:bg-[#202020] flex items-center justify-between font-bold text-white text-sm cursor-pointer transition-colors ${{activeTab === "{tab}"'
    newClass = f'`w-full p-4 hover:bg-[#202020] flex items-center justify-between font-bold text-white text-sm cursor-pointer transition-colors sticky top-0 z-20 bg-[#181818] ${{activeTab === "{tab}"'
    content = content.replace(oldClass, newClass)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("All done!")
