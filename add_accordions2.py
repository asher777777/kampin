import sys
import re

with open('src/features/crm/components/CRMFormBuilder.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add activeSettingsTab state
content = content.replace(
    'const [activeTab, setActiveTab] = useState<"form" | "styles" | "settings" | "integrations">("form");',
    'const [activeTab, setActiveTab] = useState<"form" | "styles" | "settings" | "integrations">("form");\n  const [activeSettingsTab, setActiveSettingsTab] = useState<string>("templates");'
)

# 2. Add SettingsAccordion component inside CRMFormBuilder
accordion_code = '''
  const SettingsAccordion = ({ id, title, icon: Icon, children }: any) => (
    <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#181818] mb-4">
      <button
        type="button"
        onClick={() => setActiveSettingsTab(activeSettingsTab === id ? "" : id)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <span className="font-bold text-white flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-indigo-400" />} {title}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${activeSettingsTab === id ? "rotate-180" : ""}`} />
      </button>
      {activeSettingsTab === id && (
        <div className="p-4 space-y-4 border-t border-white/5 animate-in slide-in-from-top-2 duration-300">
          {children}
        </div>
      )}
    </div>
  );

  const selectFields = (value.fields || [])
'''
content = content.replace(
    'const selectFields = (value.fields || [])',
    accordion_code
)

with open('src/features/crm/components/CRMFormBuilder.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done step 1")
