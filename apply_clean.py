import os

filepath = r'c:\Users\ovt57\Desktop\community-generator-web\src\app\dashboard\crm\ContactModal.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update useState
content = content.replace('  const [mode, setMode] = useState<"view" | "edit">("view");\n', '')
content = content.replace('useState<TabType>("details")', 'useState<TabType | "">("")')

# 2. Remove the View Mode Block
view_start = content.find('  if (mode === "view" && contact) {')
if view_start != -1:
    view_end = content.find('  return (\n    <Modal isOpen={isOpen} onClose={onClose}>', view_start)
    if view_end != -1:
        content = content[:view_start] + content[view_end:]

# 3. Add handleTabClick
handle_tab_click_code = '''
  const handleTabClick = (tabName: TabType | string) => {
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

  return ('''
content = content.replace('  return (', handle_tab_click_code, 1)

# 4. Replace Modal.Header
header_start = content.find('<Modal.Header')
header_end = content.find('/>', header_start) + 2
if header_start != -1 and header_end != -1:
    new_header = '''{isEdit ? (
            <div className="flex flex-col items-center text-center space-y-4 border-b pb-6 mb-6">
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-xl ring-4 ring-white" style={{ backgroundColor: getAvatarBg(contaName) }}>
                {getInitials(contaName, fM)}
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800">{contaName} {fM}</h3>
              </div>
              <div className="flex gap-3 w-full max-w-sm">
                {phone && (
                  <>
                    <Button 
                      variant="outline" 
                      className="flex-1 rounded-xl text-green-600 border-green-200 hover:bg-green-50"
                      onClick={() => window.open(`https://wa.me/${phone.replace(/\\D/g, '')}`, '_blank')}
                    >
                      <MessageCircle className="w-4 h-4 ml-2" />
                      וואטסאפ
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 rounded-xl text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                      onClick={() => window.location.href = `tel:${phone}`}
                    >
                      <Phone className="w-4 h-4 ml-2" />
                      התקשר
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <Modal.Header 
              title="הוספת איש קשר חדש" 
              description="מלא את שדות החובה להוספת איש קשר חדש למערכת"
            />
          )}'''
    content = content[:header_start] + new_header + content[header_end:]

# 5. Remove Tab Navigation
nav_start = content.find('          {/* Tab Navigation */}')
if nav_start != -1:
    nav_end = content.find('          {/* Tab Content: Details */}', nav_start)
    if nav_end != -1:
        content = content[:nav_start] + content[nav_end:]

# 6. Wrap Tabs
tabs_data = [
    ("details", "פרטים כלליים", "User", "", "Details", False),
    ("tags", "תיוגים והערות", "Tag", "", "Tags & Notes", False),
    ("company", "חברה ומקור", "Building", "", "Company & Lead Source", False),
    ("camp", "משפחה וקייטנה", "Users", "", "Camp & Family", False),
    ("events", "אירועים ומפגשים", "Calendar", " && isEdit", "Events Repeater", True),
    ("timeline", "ציר זמן", "Clock", " && isEdit", "Timeline", True),
    ("payments", "תשלומים", "CreditCard", " && isEdit", "Payments", True)
]

# Ensure missing icons are imported
if 'ChevronUp' not in content:
    content = content.replace('import { Calendar,', 'import { ChevronUp, ChevronDown, Calendar,')

for tab_id, tab_label, tab_icon, edit_cond, comment_text, is_edit in tabs_data:
    search_str = f'{{activeTab === "{tab_id}"{edit_cond} && ('
    comment_str = f'{{/* Tab Content: {comment_text} */}}'
    
    start_idx = content.find(comment_str)
    if start_idx == -1:
        print(f"Could not find start for {tab_id}")
        continue
        
    next_comment_idx = content.find('{/* Tab Content:', start_idx + len(comment_str))
    if next_comment_idx == -1:
        next_comment_idx = content.find('{/* Footer buttons', start_idx + len(comment_str))
        
    if next_comment_idx == -1:
        print(f"Could not find end for {tab_id}")
        continue
        
    block = content[start_idx:next_comment_idx]
    
    button_html = f'''<div className="w-full flex flex-col bg-[#181818] rounded-xl overflow-hidden border border-white/5 shadow-xl mb-4">
            <button
              type="button"
              id="tab-{tab_id}"
              onClick={{() => handleTabClick("{tab_id}")}}
              className={{`w-full p-4 hover:bg-[#202020] flex items-center justify-between font-bold text-white text-sm cursor-pointer transition-colors sticky top-0 z-20 bg-[#181818] ${{activeTab === "{tab_id}" ? "ring-1 ring-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)] z-10 relative" : "border-b border-white/5"}}`}}
            >
              <span className="flex items-center gap-3 text-white">
                <{tab_icon} className="w-4 h-4" />
                {tab_label}
              </span>
              {{activeTab === "{tab_id}" ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}}
            </button>
            {search_str}
              <div className="p-6 bg-[#111] animate-in fade-in duration-200">'''
              
    new_block = block.replace(search_str, button_html)
    
    # Close the div
    part_before, sep, part_after = new_block.rpartition('          )}\\n')
    if sep == '':
        part_before, sep, part_after = new_block.rpartition('          )}\\r\\n')
        if sep == '':
            part_before, sep, part_after = new_block.rpartition('          )}\n')
        if sep == '':
            part_before, sep, part_after = new_block.rpartition('          )}\r\n')
            
    if sep != '':
        new_block = part_before + '              </div>\n' + sep + '          </div>\n' + part_after
    else:
        print(f"Could not find closing parenthesis for {tab_id}")
        continue
        
    content = content[:start_idx] + new_block + content[next_comment_idx:]
    print(f"Wrapped {tab_id} successfully.")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("All clean and done!")
