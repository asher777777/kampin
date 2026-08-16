"use client";

import { Modal } from "@/components/ui/Modal";
import Link from "next/link";
import { Sparkles, Network, Mail, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickActionsModal({ isOpen, onClose }: QuickActionsModalProps) {
  const actions = [
    {
      name: "יצירת תוכן",
      description: "מחולל תוכן מבוסס AI",
      href: "/dashboard/services",
      icon: Sparkles,
      color: "text-purple-600 bg-purple-100",
    },
    {
      name: "אוטומציה חדשה",
      description: "יצירת תהליך אוטומטי",
      href: "/dashboard/automations",
      icon: Network,
      color: "text-blue-600 bg-blue-100",
    },
    {
      name: "קמפיין מייל חדש",
      description: "עיצוב ושליחת דיוור",
      href: "/dashboard/emails",
      icon: Mail,
      color: "text-rose-600 bg-rose-100",
    },
    {
      name: "קמפיין וואטספ חדש",
      description: "שליחת הודעות תפוצה",
      href: "/dashboard/whatsapp",
      icon: MessageSquare,
      color: "text-emerald-600 bg-emerald-100",
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Content className="sm:max-w-xl">
        <Modal.Header
          title="פעולות מהירות"
          description="בחר את הפעולה שברצונך לבצע כעת"
        />
        <Modal.Close className="left-4 right-auto" />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {actions.map((action) => (
            <Link
              key={action.name}
              href={action.href}
              onClick={onClose}
              className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:border-primary/50 hover:shadow-md transition-all group bg-white"
            >
              <div className={cn("p-3 rounded-lg shrink-0 transition-colors", action.color)}>
                <action.icon className="w-6 h-6" />
              </div>
              <div className="text-right">
                <h3 className="font-bold text-slate-800 group-hover:text-primary transition-colors">
                  {action.name}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {action.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </Modal.Content>
    </Modal>
  );
}
