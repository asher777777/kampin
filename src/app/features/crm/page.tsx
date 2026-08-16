import Link from "next/link";
import { Briefcase, CheckCircle2, ArrowRight } from "lucide-react";

export default function CRMLandingPage() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full py-20 lg:py-32 flex flex-col items-center justify-center text-center relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-100 via-background to-background dark:from-primary-900/20 dark:via-background dark:to-background"></div>
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-6">
            <div className="p-4 bg-primary-100 dark:bg-primary-900/30 rounded-2xl text-primary-600 dark:text-primary-400 mb-4">
              <Briefcase className="w-12 h-12" />
            </div>
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
              ניהול קהילה חכם עם <br />
              <span className="gradient-text">מערכת ה-CRM שלנו</span>
            </h1>
            <p className="max-w-[700px] text-lg text-foreground/70 md:text-xl">
              קח שליטה מלאה על מאגר החברים בקהילה שלך. נהל אנשי קשר, עקוב אחר מעורבות, ושלח הודעות ממוקדות על סמך פילוחי נתונים מתקדמים.
            </p>
            <div className="pt-4">
              <Link
                href="/#pricing"
                className="inline-flex h-12 items-center justify-center rounded-full bg-primary-600 px-8 text-base font-medium text-white shadow-lg shadow-primary-500/20 transition-colors hover:bg-primary-700"
              >
                התחל עכשיו
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Detail */}
      <section className="w-full py-20 bg-foreground/[0.02]">
        <div className="container px-4 md:px-6 mx-auto max-w-5xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">הכר את הלקוחות שלך מחדש</h2>
              <p className="text-lg text-foreground/70">
                המערכת שלנו אוספת נתונים מכל נקודות המגע של הקהילה איתך, ומציגה לך פרופיל מלא של כל חבר בקהילה.
              </p>
              <ul className="space-y-4 pt-4">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary-500" />
                  <span className="text-lg">פילוח קהל מתקדם (תגיות, סטטוסים)</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary-500" />
                  <span className="text-lg">היסטוריית אינטראקציות מלאה</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary-500" />
                  <span className="text-lg">חיבור לרשתות החברתיות (WhatsApp, Facebook)</span>
                </li>
              </ul>
            </div>
            <div className="glass rounded-3xl p-8 aspect-square flex flex-col items-center justify-center bg-gradient-to-br from-primary-500/10 to-accent/10 border border-primary-500/20">
              <div className="w-full h-full rounded-xl bg-background/50 border border-foreground/10 shadow-sm flex items-center justify-center p-6 text-center">
                <p className="text-foreground/50">תצוגת הדגמה של לוח הבקרה (CRM)</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="w-full py-20">
        <div className="container px-4 md:px-6 mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">מוכן לשדרג את ניהול הקהילה?</h2>
          <Link
            href="/#pricing"
            className="inline-flex h-12 items-center justify-center rounded-full bg-primary-600 px-8 text-base font-medium text-white transition-colors hover:bg-primary-700"
          >
            צפה בחבילות <ArrowRight className="ml-2 h-4 w-4 rotate-180" />
          </Link>
        </div>
      </section>
    </div>
  );
}
