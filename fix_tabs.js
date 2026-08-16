const fs = require('fs');
const filepath = 'c:/Users/ovt57/Desktop/community-generator-web/src/app/dashboard/crm/ContactModal.tsx';
let content = fs.readFileSync(filepath, 'utf8');

// 1. Fix initialization
content = content.replace('setActiveTab("details");', 'setActiveTab("" as any);');

// 2. Insert handleTabClick before the main return
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

content = content.replace('  return (', handleTabClickCode);

// 3. Update all buttons
const tabs = ["details", "tags", "company", "camp", "events", "timeline", "payments", "userDetails"];

tabs.forEach(tab => {
    // We are looking for something like: onClick={() => setActiveTab(activeTab === "details" ? "" as any : "details")}
    const oldOnClick = `onClick={() => setActiveTab(activeTab === "${tab}" ? "" as any : "${tab}")}`;
    const newOnClick = `id="tab-${tab}"\n              onClick={() => handleTabClick("${tab}")}`;
    content = content.replace(oldOnClick, newOnClick);
});

fs.writeFileSync(filepath, content, 'utf8');
console.log("Tabs fixed successfully!");
