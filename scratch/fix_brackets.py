import re

with open("src/features/crm/components/CRMFormBuilder.tsx", "r", encoding="utf-8") as f:
    content = f.read()

start_marker = "              {/* Right Column: Submit Button Customizer & Preview */}"
end_marker = "      {/* Add Custom Field Modal */}"

replacement = """              {/* Right Column: Submit Button Customizer & Preview */}
              <div className="bg-[#181818] p-6 rounded-3xl border border-white/5 text-xs">
                <SettingsAccordion id="design" title="עיצוב כפתור ושדות" icon={Palette}>
                  <div className="space-y-4 flex flex-col justify-between">
                    <div className="space-y-4">
                      <label className="block font-semibold mb-1 text-slate-400">טקסט כפתור שליחה</label>
                      <input
                        type="text"
                        value={value.submit_button_text}
                        onChange={(e) => updateConfig({ submit_button_text: e.target.value })}
                        className="w-full bg-[#111] text-white border border-white/10 rounded-xl p-2.5 outline-none"
                        placeholder="שליחה"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold mb-1 text-slate-400">צבע רקע כפתור</label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="color"
                            value={value.submit_button_bg_color || "#3b82f6"}
                            onChange={(e) => updateConfig({ submit_button_bg_color: e.target.value })}
                            className="w-10 h-10 border border-white/10 rounded-xl cursor-pointer p-0.5 bg-transparent"
                          />
                          <span className="font-mono text-[10px] text-white">{value.submit_button_bg_color || "#3b82f6"}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block font-semibold mb-1 text-slate-400">צבע טקסט כפתור</label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="color"
                            value={value.submit_button_text_color || "#ffffff"}
                            onChange={(e) => updateConfig({ submit_button_text_color: e.target.value })}
                            className="w-10 h-10 border border-white/10 rounded-xl cursor-pointer p-0.5 bg-transparent"
                          />
                          <span className="font-mono text-[10px] text-white">{value.submit_button_text_color || "#ffffff"}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block font-semibold mb-1 text-slate-400">צבע רקע שדות</label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="color"
                            value={value.field_bg_color || "#f8fafc"}
                            onChange={(e) => updateConfig({ field_bg_color: e.target.value })}
                            className="w-10 h-10 border border-white/10 rounded-xl cursor-pointer p-0.5 bg-transparent"
                          />
                          <span className="font-mono text-[10px] text-white">{value.field_bg_color || "#f8fafc"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-black/20 p-6 rounded-2xl border border-white/5 text-center space-y-3 mt-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">תצוגה מקדימה כפתור</span>
                      <button
                        type="button"
                        style={{
                          backgroundColor: value.submit_button_bg_color,
                          color: value.submit_button_text_color
                        }}
                        className="w-full py-3.5 px-6 rounded-xl font-bold text-sm shadow-md transition-all hover:scale-[1.02]"
                      >
                        {value.submit_button_text}
                      </button>
                    </div>
                  </div>
                </SettingsAccordion>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  </div>

"""

import sys

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + replacement + content[end_idx:]
    with open("src/features/crm/components/CRMFormBuilder.tsx", "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Replaced successfully!")
else:
    print("Markers not found")
