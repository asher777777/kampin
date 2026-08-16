import sys
import re

with open('src/features/crm/components/CRMFormBuilder.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace block 1: Templates
content = content.replace(
'''                <h4 className="font-bold text-white text-sm border-b border-white/10 pb-2">
                  תבניות טפסים
                </h4>
                <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-4">''',
'''                <SettingsAccordion id="templates" title="תבניות טפסים" icon={Settings2}>
                  <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-4">'''
)
# Close block 1 and start block 2: Sync and Management
content = content.replace(
'''                </div>

                <h4 className="font-bold text-white text-sm border-b border-white/10 pb-2 mt-6">
                  הגדרות סנכרון וניהול
                </h4>

                <div>''',
'''                  </div>
                </SettingsAccordion>

                <SettingsAccordion id="sync" title="הגדרות סנכרון וניהול" icon={Settings2}>
                  <div>'''
)
# Close block 2 and start block 3: Conditional actions
content = content.replace(
'''                  </div>
                )}

                <h4 className="font-bold text-white text-sm border-b border-white/10 pb-2 mt-6">
                  הודעת תודה / פעולות מותנות
                </h4>

                <div className="space-y-4">''',
'''                  </div>
                )}
                </SettingsAccordion>

                <SettingsAccordion id="actions" title="הודעת תודה / פעולות מותנות" icon={Settings2}>
                  <div className="space-y-4">'''
)

# Close block 3
content = content.replace(
'''                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Submit Button Customizer & Preview */}''',
'''                      </div>
                    )}
                  </div>
                </div>
                </SettingsAccordion>
              </div>

              {/* Right Column: Submit Button Customizer & Preview */}'''
)

with open('src/features/crm/components/CRMFormBuilder.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done step 2")
