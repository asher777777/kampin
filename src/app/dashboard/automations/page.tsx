import { GenericCanvas } from "@/components/dashboard/GenericCanvas";
import { Zap, Puzzle, Clock } from "lucide-react";

export default function AutomationsPage() {
  const options = [
    { label: "יצירת אוטומציה חדשה", actionText: "אני רוצה ליצור אוטומציה חדשה", icon: <Zap className="w-6 h-6" /> },
    { label: "חיבור מערכות חיצוניות", actionText: "איך אני מחבר מערכות חיצוניות?", icon: <Puzzle className="w-6 h-6" /> },
    { label: "הגדרת טריגרים בזמן", actionText: "אני רוצה להגדיר פעולות מתוזמנות", icon: <Clock className="w-6 h-6" /> }
  ];

  return (
    <GenericCanvas
      title="אוטומציות וחיבורים"
      subtitle="אילו תהליכים אוטומטיים תרצה להקים היום?"
      icon={<Zap />}
      initialOptions={options}
      context="/dashboard/automations"
    />
  );
}
