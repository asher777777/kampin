import Link from "next/link";
import { FileText, CheckCircle2, ArrowRight } from "lucide-react";

export default function ContentMarketingPage() {
  return (
    <div className="flex flex-col items-center">
      <section className="w-full py-20 lg:py-32 flex flex-col items-center justify-center text-center relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/20 via-background to-background dark:from-accent/10 dark:via-background dark:to-background"></div>
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-6">
            <div className="p-4 bg-accent/10 rounded-2xl text-accent mb-4">
              <FileText className="w-12 h-12" />
            </div>
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
              להגיע ללב הקהל עם <br />
              <span className="text-accent">שיווק תוכן אוטומטי</span>
            </h1>
            <p className="max-w-[700px] text-lg text-foreground/70 md:text-xl">
              צור, נהל והפץ תכנים, מאמרים ושיעורים בצורה חכמה ואוטומטית לחברי הקהילה שלך.
            </p>
            <div className="pt-4">
              <Link
                href="/#pricing"
                className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-8 text-base font-medium text-white shadow-lg shadow-accent/20 transition-colors hover:bg-accent/90"
              >
                התחל עכשיו
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full py-20 bg-foreground/[0.02]">
        <div className="container px-4 md:px-6 mx-auto max-w-5xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 glass rounded-3xl p-8 aspect-square flex flex-col items-center justify-center bg-gradient-to-br from-accent/10 to-primary-500/10 border border-accent/20">
              <div className="w-full h-full rounded-xl bg-background/50 border border-foreground/10 shadow-sm flex items-center justify-center p-6 text-center">
                <p className="text-foreground/50">תצוגת הדגמה של מערכת התוכן</p>
              </div>
            </div>
            <div className="space-y-6 order-1 md:order-2">
              <h2 className="text-3xl font-bold">הפצה אוטומטית שחוסכת זמן</h2>
              <p className="text-lg text-foreground/70">
                מערכת שיווק התוכן שלנו מאפשרת לך לתזמן פרסומים מראש, לשלוח ניוזלטרים חכמים, ולנהל קורסים ושיעורים דיגיטליים בצורה נוחה.
              </p>
              <ul className="space-y-4 pt-4">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-accent" />
                  <span className="text-lg">תזמון אוטומטי של תכנים</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-accent" />
                  <span className="text-lg">הקמת מערכת שיעורים וקורסים (LMS)</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-accent" />
                  <span className="text-lg">מעקב קריאה ומעורבות משתמשים</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full py-20">
        <div className="container px-4 md:px-6 mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">הפוך את התוכן שלך למנוע צמיחה</h2>
          <Link
            href="/#pricing"
            className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-8 text-base font-medium text-white transition-colors hover:bg-accent/90"
          >
            בחר חבילה <ArrowRight className="ml-2 h-4 w-4 rotate-180" />
          </Link>
        </div>
      </section>
    </div>
  );
}
