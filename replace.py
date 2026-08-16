import sys

with open('src/features/crm/components/CRMFormBuilder.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

accordion_code = """const SettingsAccordion = ({ id, title, icon: Icon, children, activeTab, setActiveTab }: any) => (
  <div className="border border-white/5 rounded-2xl overflow-hidden bg-[#181818]">
    <button
      type="button"
      onClick={() => setActiveTab(activeTab === id ? "" : id)}
      className="w-full p-4 flex justify-between items-center bg-[#202020]/50 hover:bg-[#252525] transition-colors"
    >
      <span className="flex items-center gap-2 font-bold text-white text-sm">
        <Icon className="w-4 h-4 text-indigo-400" /> {title}
      </span>
      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${activeTab === id ? "rotate-180" : ""}`} />
    </button>
    {activeTab === id && <div className="p-4 bg-[#111]">{children}</div>}
  </div>
);

export function CRMFormBuilder"""

content = content.replace('export function CRMFormBuilder', accordion_code)

state_code = """const [activeTab, setActiveTab] = useState<"fields" | "whatsapp" | "settings">("fields");
  const [activeSettingsTab, setActiveSettingsTab] = useState<string>("");"""

content = content.replace('const [activeTab, setActiveTab] = useState<"fields" | "whatsapp" | "settings">("fields");', state_code)

content = content.replace('<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">', '<div className="flex flex-col gap-4">')

content = content.replace("""              <div className="bg-[#181818] p-6 rounded-3xl border border-white/5 space-y-4 text-xs">
                <h4 className="font-bold text-white text-sm border-b border-white/10 pb-2">
                  תבניות טפסים
                </h4>""", """              <div className="bg-[#181818] p-6 rounded-3xl border border-white/5 space-y-4 text-xs">
                <SettingsAccordion 
                  id="templates" 
                  title="תבניות טפסים" 
                  icon={Settings2}
                  activeTab={activeSettingsTab}
                  setActiveTab={setActiveSettingsTab}
                >""")

content = content.replace("""                <h4 className="font-bold text-white text-sm border-b border-white/10 pb-2 mt-6">
                  הגדרות סנכרון וניהול
                </h4>""", """                </SettingsAccordion>

                <SettingsAccordion 
                  id="sync" 
                  title="הגדרות סנכרון וניהול" 
                  icon={Settings2}
                  activeTab={activeSettingsTab}
                  setActiveTab={setActiveSettingsTab}
                >""")

content = content.replace("""                <h4 className="font-bold text-white text-sm border-b border-white/10 pb-2 mt-6">
                  הודעת תודה / פעולות מותנות
                </h4>""", """                </SettingsAccordion>

                <SettingsAccordion 
                  id="advanced" 
                  title="הודעת תודה / פעולות מותנות" 
                  icon={Settings2}
                  activeTab={activeSettingsTab}
                  setActiveTab={setActiveSettingsTab}
                >""")

content = content.replace("""                  </div>
                </div>
              </div>

              {/* Right Column: Submit Button Customizer & Preview */}
              <div className="bg-[#181818] p-6 rounded-3xl border border-white/5 space-y-4 text-xs flex flex-col justify-between">
                <div className="space-y-4">
                  <h4 className="font-bold text-white text-sm border-b border-white/10 pb-2">
                    עיצוב כפתור השליחה
                  </h4>""", """                  </div>
                </div>
                </SettingsAccordion>
              </div>

              {/* Right Column: Submit Button Customizer & Preview */}
              <div className="bg-[#181818] p-6 rounded-3xl border border-white/5 text-xs">
                <SettingsAccordion 
                  id="design" 
                  title="עיצוב כפתור ושדות" 
                  icon={Palette}
                  activeTab={activeSettingsTab}
                  setActiveTab={setActiveSettingsTab}
                >
                  <div className="space-y-4 flex flex-col justify-between">
                    <div className="space-y-4">""")

content = content.replace("""                    {value.submit_button_text}
                  </button>
                </div>
              </div>
            </div>
            </div>
          )}""", """                    {value.submit_button_text}
                  </button>
                </div>
                  </div>
                </SettingsAccordion>
              </div>
            </div>
            </div>
          )}""")

with open('src/features/crm/components/CRMFormBuilder.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
