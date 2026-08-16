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
); // Just in case, though we will remove the whole view mode anyway.

// 3. Remove the entire view mode block
const startIdx = content.indexOf('  if (mode === "view" && contact) {');
const endIdx = content.indexOf('  return (\n    <Modal isOpen={isOpen} onClose={onClose}>\n      <Modal.Content className="max-w-3xl rounded-[2rem] p-8">');

if (startIdx !== -1 && endIdx !== -1) {
  content = content.substring(0, startIdx) + content.substring(endIdx);
}

// 4. Replace Modal.Header
const headerOld = `          <Modal.Header \n            title={isEdit ? \`עריכת איש קשר: \${contaName} \${fM}\` : "הוספת איש קשר חדש"} \n          description={isEdit ? "עדכן את פרטי איש הקשר ונהל היסטוריית אינטראקציות" : "מלא את שדות החובה להוספת איש קשר חדש למערכת"}\n        />`;

const headerNew = `          {isEdit ? (
            <div className="flex flex-col items-center text-center space-y-4 border-b pb-6 mb-6">
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

content = content.replace(headerOld, headerNew);

// 5. Remove the top tab navigation
const tabNavStart = content.indexOf('            {/* Tab Navigation */}');
const tabNavEnd = content.indexOf('          <div className="w-full flex flex-col bg-[#181818] rounded-xl overflow-hidden border border-white/5 shadow-xl mb-4">', tabNavStart);

if (tabNavStart !== -1 && tabNavEnd !== -1) {
  content = content.substring(0, tabNavStart) + content.substring(tabNavEnd);
}

// 6. Add sticky classes to all accordion buttons
const buttonPattern = /(<button\s+type="button"\s+onClick=\{\(\) => setActiveTab\([^)]+\)\}\s+className=\{`w-full p-4 hover:bg-\[#202020\] flex items-center justify-between font-bold text-white text-sm cursor-pointer transition-colors)/g;
const replacement = '$1 sticky top-0 z-20 bg-[#181818]';
content = content.replace(buttonPattern, replacement);

fs.writeFileSync(filepath, content, 'utf8');
console.log("Done");
