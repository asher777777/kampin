import { GenericCanvas } from "@/components/dashboard/GenericCanvas";
import { Mail, Edit3, SendHorizontal } from "lucide-react";

export default function CampaignsPage() {
  const options = [
    { label: "קמפיין אימייל חדש", actionText: "אני רוצה ליצור קמפיין אימייל חדש", icon: <Mail className="w-6 h-6" /> },
    { label: "ניסוח הודעה שיווקית", actionText: "תעזור לי לנסח הודעה שיווקית", icon: <Edit3 className="w-6 h-6" /> },
    { label: "קמפיין למתעניינים", actionText: "אני רוצה לשלוח קמפיין למתעניינים חדשים", icon: <SendHorizontal className="w-6 h-6" /> }
  ];

  return (
    <GenericCanvas
      title="מערכת קמפיינים (Email & WhatsApp)"
      subtitle="איזה קמפיין תרצה לשלוח היום?"
      icon={<Mail />}
      initialOptions={options}
      context="/dashboard/campaigns"
    />
  );
}
