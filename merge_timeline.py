import os

filepath = r'c:\Users\ovt57\Desktop\community-generator-web\src\app\dashboard\crm\ContactModal.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add new state
if 'eventSubTab' not in content:
    content = content.replace(
        'const [events, setEvents] = useState<ContactEvent[]>([]);',
        'const [events, setEvents] = useState<ContactEvent[]>([]);\n  const [eventSubTab, setEventSubTab] = useState<"events" | "timeline">("events");'
    )

# 2. Extract Timeline Content
timeline_start_str = '{/* Tab Content: Timeline */}'
timeline_start = content.find(timeline_start_str)

if timeline_start != -1:
    timeline_end = content.find('{/* Tab Content: Payments */}', timeline_start)
    if timeline_end != -1:
        timeline_block = content[timeline_start:timeline_end]
        
        inner_timeline_start = timeline_block.find('<h4 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-2">ציר זמן אינטראקציות ופעולות</h4>')
        inner_timeline_end = timeline_block.rfind('</div>\n              </div>\n          )}\n          </div>')
        if inner_timeline_end == -1:
            inner_timeline_end = timeline_block.rfind('</div>\r\n              </div>\r\n          )}\r\n          </div>')
            
        inner_timeline = timeline_block[inner_timeline_start:inner_timeline_end].strip()
        
        content = content[:timeline_start] + content[timeline_end:]
        
        events_start = content.find('{/* Tab Content: Events Repeater */}')
        if events_start != -1:
            events_content_start = content.find('<div className="space-y-4 animate-in fade-in">', events_start)
            if events_content_start != -1:
                events_inner_start = events_content_start + len('<div className="space-y-4 animate-in fade-in">')
                
                events_inner_end = content.find('</div>\n              </div>\n          )}\n          </div>', events_inner_start)
                if events_inner_end == -1:
                    events_inner_end = content.find('</div>\r\n              </div>\r\n          )}\r\n          </div>', events_inner_start)
                    
                inner_events = content[events_inner_start:events_inner_end].strip()
                
                new_events_block = """
                {/* Sub-Tabs Navigation */}
                <div className="flex border-b border-white/5 mb-6">
                  <button
                    type="button"
                    onClick={() => setEventSubTab("events")}
                    className={`px-6 py-3 font-bold text-sm transition-colors ${
                      eventSubTab === "events"
                        ? "border-b-2 border-indigo-500 text-indigo-400"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    רשימת אירועים
                  </button>
                  <button
                    type="button"
                    onClick={() => setEventSubTab("timeline")}
                    className={`px-6 py-3 font-bold text-sm transition-colors ${
                      eventSubTab === "timeline"
                        ? "border-b-2 border-indigo-500 text-indigo-400"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    ציר זמן
                  </button>
                </div>
                
                {eventSubTab === "events" && (
                  <div className="animate-in fade-in space-y-4">
                    """ + inner_events + """
                  </div>
                )}
                
                {eventSubTab === "timeline" && (
                  <div className="animate-in fade-in space-y-4">
                    """ + inner_timeline + """
                  </div>
                )}
"""
                content = content[:events_inner_start] + '\\n' + new_events_block + '\\n' + content[events_inner_end:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Merged timeline into events tab")
