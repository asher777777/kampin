const fs = require('fs');
const filepath = 'c:/Users/ovt57/Desktop/community-generator-web/src/app/dashboard/crm/ContactModal.tsx';
let content = fs.readFileSync(filepath, 'utf8');

const startMatch = '  if (mode === "view" && contact) {';
const endMatch = '  return (\r\n    <Modal isOpen={isOpen} onClose={onClose}>\r\n      <Modal.Content className="max-w-3xl rounded-[2rem] p-8">';
const endMatchLF = '  return (\n    <Modal isOpen={isOpen} onClose={onClose}>\n      <Modal.Content className="max-w-3xl rounded-[2rem] p-8">';

const startIdx = content.indexOf(startMatch);
let endIdx = content.indexOf(endMatch);
if (endIdx === -1) endIdx = content.indexOf(endMatchLF);

if (startIdx !== -1 && endIdx !== -1) {
    content = content.substring(0, startIdx) + content.substring(endIdx);
    fs.writeFileSync(filepath, content, 'utf8');
    console.log("Removed view mode successfully!");
} else {
    console.log("Could not find bounds. start:", startIdx, "end:", endIdx);
}
