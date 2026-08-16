const fs = require('fs');

const filepath = 'c:/Users/ovt57/Desktop/community-generator-web/src/app/dashboard/crm/ContactModal.tsx';
let content = fs.readFileSync(filepath, 'utf8');

// 1. Update activeTab initial state and remove mode state
content = content.replace(
  '  const [mode, setMode] = useState<"view" | "edit">("view");\n  const [activeTab, setActiveTab] = useState<TabType>("details");',
  '  const [activeTab, setActiveTab] = useState<TabType | "">("");'
);

// 2. Remove setMode calls
content = content.replace('setMode("view");', '');
content = content.replace('setMode("edit");', '');
content = content.replace(
  '                <button\n                  onClick={() => setMode("edit")}',
  '                <button'
); 

// 3. Remove the entire view mode block
const startViewMatch = '  if (mode === "view" && contact) {';
const endViewMatch = '  return (\r\n    <Modal isOpen={isOpen} onClose={onClose}>\r\n      <Modal.Content className="max-w-3xl rounded-[2rem] p-8">';
const endViewMatchLF = '  return (\n    <Modal isOpen={isOpen} onClose={onClose}>\n      <Modal.Content className="max-w-3xl rounded-[2rem] p-8">';

const startIdx = content.indexOf(startViewMatch);
let endIdx = content.indexOf(endViewMatch);
if (endIdx === -1) endIdx = content.indexOf(endViewMatchLF);

if (startIdx !== -1 && endIdx !== -1) {
    content = content.substring(0, startIdx) + content.substring(endIdx);
} else {
    console.log("Could not find view mode bounds.");
}

// 4. Inject handleTabClick before the main return
const mainReturnMatch = '  return (\r\n    <Modal isOpen={isOpen} onClose={onClose}>';
const mainReturnMatchLF = '  return (\n    <Modal isOpen={isOpen} onClose={onClose}>';

const handleTabClickCode = `  const handleTabClick = (tabName: TabType | string) => {
    if (activeTab === tabName) {
      setActiveTab("" as any);
    } else {
      setActiveTab(tabName as any);
      setTimeout(() => {
        const el = document.getElementById(\`tab-\${tabName}\`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  };

  return (`;

if (content.indexOf(mainReturnMatch) !== -1) {
    content = content.replace(mainReturnMatch, handleTabClickCode + '\r\n    <Modal isOpen={isOpen} onClose={onClose}>');
} else if (content.indexOf(mainReturnMatchLF) !== -1) {
    content = content.replace(mainReturnMatchLF, handleTabClickCode + '\n    <Modal isOpen={isOpen} onClose={onClose}>');
} else {
    console.log("Could not find main return");
}

// 5. Replace Modal.Header
const headerOldMatch = '<Modal.Header';
const endHeaderMatch = '/>';
const startHeaderIdx = content.indexOf(headerOldMatch, content.indexOf('<Modal.Close'));

if (startHeaderIdx !== -1) {
    const endHeaderIdx = content.indexOf(endHeaderMatch, startHeaderIdx) + endHeaderMatch.length;
    
    const newHeader = `{isEdit ? (
            <div className="flex flex-col items-center text-center space-y-4 border-b border-white/10 pb-6 mb-6">
              <div className={\`w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-black shadow-md \${getAvatarBg(contaName)}\`}>
                {getInitials(contaName, fM)}
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-black text-white">
                  {contaName} {fM}
                </h3>
              </div>
              <div className="flex justify-center gap-2.5 w-full max-w-sm pt-2">
                <a
                  href={\`https://wa.me/\${contaPhone.replace(/[^0-9]/g, "")}\`}
                  target="_blank"
                  className="flex-1 py-2 px-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  וואטסאפ
                </a>
                <a
                  href={\`tel:\${contaPhone}\`}
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
          )}`;

    content = content.substring(0, startHeaderIdx) + newHeader + content.substring(endHeaderIdx);
} else {
    console.log("Could not find Modal.Header");
}

// 6. Remove the top tab navigation
const tabNavStart = content.indexOf('            {/* Tab Navigation */}');
const tabNavEnd = content.indexOf('          <div className="w-full flex flex-col bg-[#181818] rounded-xl overflow-hidden border border-white/5 shadow-xl mb-4">', tabNavStart);

if (tabNavStart !== -1 && tabNavEnd !== -1) {
  content = content.substring(0, tabNavStart) + content.substring(tabNavEnd);
}

// 7. Fix setActiveTab on init (line 131 roughly)
content = content.replace('setActiveTab("details");', 'setActiveTab("" as any);');

// 8. Add sticky classes and handleTabClick to all accordion buttons
const tabs = ["details", "tags", "company", "camp", "events", "timeline", "payments", "userDetails"];

tabs.forEach(tab => {
    // Replace the button onClick and add id
    const oldOnClick = \`onClick={() => setActiveTab(activeTab === "\${tab}" ? "" as any : "\${tab}")}\`;
    const newOnClick = \`id="tab-\${tab}"\\n              onClick={() => handleTabClick("\${tab}")}\`;
    content = content.replace(oldOnClick, newOnClick);
    
    // Make it sticky
    // We look for \`w-full p-4 hover:bg-[#202020] flex items-center justify-between font-bold text-white text-sm cursor-pointer transition-colors \${activeTab === "\${tab}"
    const oldClass = \`\\\`w-full p-4 hover:bg-[#202020] flex items-center justify-between font-bold text-white text-sm cursor-pointer transition-colors \\\${activeTab === "\${tab}"\`;
    const newClass = \`\\\`w-full p-4 hover:bg-[#202020] flex items-center justify-between font-bold text-white text-sm cursor-pointer transition-colors sticky top-0 z-20 bg-[#181818] \\\${activeTab === "\${tab}"\`;
    content = content.replace(oldClass, newClass);
});

fs.writeFileSync(filepath, content, 'utf8');
console.log("All done!");
