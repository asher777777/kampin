import re

filepath = r'c:\Users\ovt57\Desktop\community-generator-web\src\app\dashboard\crm\ContactModal.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

tabs_data = [
    ("tags", "תיוגים והערות", "Tag", "", "Tags & Notes", False),
    ("company", "חברה ומקור", "Building", "", "Company & Lead Source", False),
    ("camp", "משפחה וקייטנה", "Users", "", "Camp & Family", False),
    ("events", "אירועים ומפגשים", "Calendar", " && isEdit", "Events Repeater", True)
]

for tab_id, tab_label, tab_icon, edit_cond, comment_text, is_edit in tabs_data:
    # Example: {/* Tab Content: Tags & Notes */}
    search_str = f'{{activeTab === "{tab_id}"{edit_cond} && ('
    
    # We locate the block by finding the comment
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
        
    # Extract the block
    block = content[start_idx:next_comment_idx]
    
    # Check if we already wrapped it (in case it was partially successful before)
    if f'id="tab-{tab_id}"' in block:
        print(f"Tab {tab_id} is already wrapped.")
        continue
        
    # Replace the opening condition
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
    
    # Close the divs at the end of the block
    idx = new_block.rfind('\\n          )}\\n')
    sep = '          )}\\n'
    if idx == -1:
        # Check CRLF
        idx = new_block.rfind('\\r\\n          )}\\r\\n')
        sep = '          )}\\r\\n'
        
    if idx == -1:
        # Just find the last occurrence of `          )}`
        part_before, sep, part_after = new_block.rpartition('          )}\\n')
        if sep == '':
            part_before, sep, part_after = new_block.rpartition('          )}\\r\\n')
            if sep == '':
                part_before, sep, part_after = new_block.rpartition('          )}\n')
            if sep == '':
                part_before, sep, part_after = new_block.rpartition('          )}\r\n')
    else:
        part_before, sep, part_after = new_block.rpartition(sep)
        
    if sep != '':
        new_block = part_before + '              </div>\n' + sep + '          </div>\n' + part_after
    else:
        print(f"Could not find closing parenthesis for {tab_id}")
        continue
        
    # Replace in main content
    content = content[:start_idx] + new_block + content[next_comment_idx:]
    print(f"Wrapped {tab_id} successfully.")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Done!")
