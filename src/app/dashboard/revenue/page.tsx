import { GenericCanvas } from "@/components/dashboard/GenericCanvas";
import { CreditCard, FileText, Landmark } from "lucide-react";

export default function RevenuePage() {
  const options = [
    { label: "הפקת קבלה ידנית", actionText: "עבור מי תרצה להוציא קבלה?", icon: <FileText className="w-6 h-6" /> },
    { label: "חיבור חברת סליקה", actionText: "איך אני מחבר חברת סליקה?", icon: <CreditCard className="w-6 h-6" /> },
    { label: "הפקדת שיק / העברה", actionText: "אני רוצה לתעד העברה בנקאית", icon: <Landmark className="w-6 h-6" /> }
  ];

  return (
    <GenericCanvas
      title="יצירת הכנסה"
      subtitle="מה תרצה לתעד או להפיק היום?"
      icon={<CreditCard />}
      initialOptions={options}
      context="/dashboard/revenue"
    />
  );
}
