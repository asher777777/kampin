const fs = require('fs');
const filepath = 'c:/Users/ovt57/Desktop/community-generator-web/src/app/dashboard/crm/ContactModal.tsx';
let content = fs.readFileSync(filepath, 'utf8');

const newHeader = `          {isEdit ? (
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

// Find the Modal.Header block
const startMatch = '<Modal.Header';
const endMatch = '/>';
const startIdx = content.indexOf(startMatch, content.indexOf('<Modal.Close'));

if (startIdx !== -1) {
    const endIdx = content.indexOf(endMatch, startIdx) + endMatch.length;
    content = content.substring(0, startIdx) + newHeader + content.substring(endIdx);
    fs.writeFileSync(filepath, content, 'utf8');
    console.log("Replaced successfully!");
} else {
    console.log("Could not find Modal.Header");
}
