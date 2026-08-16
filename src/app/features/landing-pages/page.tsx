import Link from "next/link";
import { LayoutTemplate, CheckCircle2, ArrowRight } from "lucide-react";

export default function LandingPagesFeaturePage() {
  return (
    <div className="flex flex-col items-center">
      <section className="w-full py-20 lg:py-32 flex flex-col items-center justify-center text-center relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-500/20 via-background to-background dark:from-green-500/10 dark:via-background dark:to-background"></div>
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-6">
            <div className="p-4 bg-green-500/10 rounded-2xl text-green-600 dark:text-green-400 mb-4">
              <LayoutTemplate className="w-12 h-12" />
            </div>
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
              עמודי נחיתה ש<span className="text-green-600 dark:text-green-400">ממירים יותר</span>
            </h1>
            <p className="max-w-[700px] text-lg text-foreground/70 md:text-xl">
              בנה עמודי נחיתה מרהיבים, דפי תרומה (מצ'ינג), ודפי הרשמה לאירועים תוך דקות - ללא צורך בידע טכני.
            </p>
            <div className="pt-4">
              <Link
                href="/#pricing"
                className="inline-flex h-12 items-center justify-center rounded-full bg-green-600 px-8 text-base font-medium text-white shadow-lg shadow-green-500/20 transition-colors hover:bg-green-700"
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
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">עיצוב מתקדם, בקליק</h2>
              <p className="text-lg text-foreground/70">
                עורך חזותי מלא המאפשר גרירה והשמטה של אלמנטים (Drag & Drop), יחד עם תבניות מוכנות מראש שיעזרו לכם לצאת לדרך מהר.
              </p>
              <ul className="space-y-4 pt-4">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  <span className="text-lg">עורך ויזואלי ידידותי</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  <span className="text-lg">טפסי הרשמה המחוברים ישירות ל-CRM</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  <span className="text-lg">מערכת סליקה (קשר) מובנית לדפי תרומה</span>
                </li>
              </ul>
            </div>
            <div className="glass rounded-3xl p-8 aspect-square flex flex-col items-center justify-center bg-gradient-to-br from-green-500/10 to-primary-500/10 border border-green-500/20">
              <div className="w-full h-full rounded-xl bg-background/50 border border-foreground/10 shadow-sm flex items-center justify-center p-6 text-center">
                <p className="text-foreground/50">תצוגת הדגמה של בונה עמודי הנחיתה</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full py-20">
        <div className="container px-4 md:px-6 mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">התחל לבנות עמודים מרהיבים</h2>
          <Link
            href="/#pricing"
            className="inline-flex h-12 items-center justify-center rounded-full bg-green-600 px-8 text-base font-medium text-white transition-colors hover:bg-green-700"
          >
            לכל החבילות <ArrowRight className="ml-2 h-4 w-4 rotate-180" />
          </Link>
        </div>
      </section>
    </div>
  );
}
