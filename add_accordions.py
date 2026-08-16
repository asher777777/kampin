import re
import os

filepath = r'c:\Users\ovt57\Desktop\community-generator-web\src\app\dashboard\crm\ContactModal.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the horizontal tab navigation block
start_nav = content.find('          {/* Tab Navigation */}')
if start_nav != -1:
    end_nav = content.find('          {/* Tab Content: Details */}', start_nav)
    if end_nav != -1:
        content = content[:start_nav] + content[end_nav:]

# 2. Find and replace each tab content block with the accordion wrapper
# To do this safely, we will replace the `{/* Tab Content: X */}` lines AND the `{activeTab === "X" && (` lines.

tabs_data = [
    ("details", "פרטים כלליים", "User", ""),
    ("camp", "משפחה וקייטנה", "Users", ""),
    ("tags", "תיוגים והערות", "Tag", ""),
    ("company", "חברה ומקור", "Building", ""),
    ("events", "אירועים ומפגשים", "Calendar", " && isEdit"),
    ("timeline", "ציר זמן", "Clock", " && isEdit"),
    ("payments", "תשלומים", "CreditCard", " && isEdit"),
]

# We also need to add imports for ChevronUp and ChevronDown if missing
if 'ChevronUp' not in content:
    content = content.replace('import { Calendar,', 'import { ChevronUp, ChevronDown, Calendar,')

for tab_id, tab_label, tab_icon, edit_cond in tabs_data:
    # Look for `{activeTab === "tab_id"[...] && (`
    search_str = f'{{activeTab === "{tab_id}"{edit_cond} && ('
    
    # We will wrap the WHOLE thing in our new accordion container.
    # The actual content of the tab is everything after `search_str` up to the closing `)}`.
    # Actually, it's easier to just replace `search_str` with the button + the opening of the content div.
    
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
              <div className="p-6 bg-[#111] animate-in fade-in duration-200">
'''

    # But wait! I also need to close the `<div className="p-6 bg-[#111]...">` AND the wrapper `<div>`.
    # How? It's better to just write a simple script that matches `search_str` and replaces it, then we manually add `</div></div>` before the next `/* Tab Content: ` or `/* Footer buttons */`.

# Because Regex on JSX is hard, let's just do an exact split or use a known marker.
# We know each tab ends right before the next `{/* Tab Content:` or `{/* Footer buttons */}`.

parts = content.split('          {/* Tab Content: ')
new_content = parts[0]

for i in range(1, len(parts)):
    part = parts[i]
    if part.startswith('Details */}'):
        tab_id, tab_label, tab_icon, edit_cond = tabs_data[0]
    elif part.startswith('Camp */}'):
        tab_id, tab_label, tab_icon, edit_cond = tabs_data[1]
    elif part.startswith('Tags */}'):
        tab_id, tab_label, tab_icon, edit_cond = tabs_data[2]
    elif part.startswith('Company */}'):
        tab_id, tab_label, tab_icon, edit_cond = tabs_data[3]
    elif part.startswith('Events */}'):
        tab_id, tab_label, tab_icon, edit_cond = tabs_data[4]
    elif part.startswith('Timeline */}'):
        tab_id, tab_label, tab_icon, edit_cond = tabs_data[5]
    elif part.startswith('Payments */}'):
        tab_id, tab_label, tab_icon, edit_cond = tabs_data[6]
    else:
        # Unknown, just append it
        new_content += '          {/* Tab Content: ' + part
        continue

    # Now we have the part. Let's find the closing `)}` which should be right before the end.
    # Actually, if we just look for `\n          )}` at the end of the block.
    # It's better to split by `\n          )}`
    
    # Wait, what if we just replace `{activeTab === "..." && (`
    search_str = f'{{activeTab === "{tab_id}"{edit_cond} && ('
    
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
              <div className="p-6 bg-[#111] animate-in fade-in duration-200">
'''
    part = part.replace(search_str, button_html)
    
    # Now we must append `</div></div>` right after the closing `)}` of this tab.
    # The block ends with `\n          )}\n`
    # Let's do a reverse replace of `\n          )}\n`
    
    idx = part.rfind('\\n          )}\\n')
    if idx == -1:
        idx = part.rfind('\\r\\n          )}\\r\\n')
    if idx == -1:
        # Try finding just `)}` at the very end (before whitespace)
        # We can just rpartition it.
        pass
        
    part_before, sep, part_after = part.rpartition('          )}\n')
    if sep == '':
        part_before, sep, part_after = part.rpartition('          )}\r\n')
    
    if sep != '':
        part = part_before + '              </div>\n' + sep + '          </div>\n' + part_after
        
    new_content += '          {/* Tab Content: ' + part

# Wait, what if there's no Footer buttons split? The `parts` logic covers everything.
# Let's save.
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(new_content)
print("Accordion added successfully!")
