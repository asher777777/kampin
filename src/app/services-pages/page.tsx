import { adminDb } from "@/lib/firebase-admin";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getGlobalSettings } from "@/features/settings/actions";
import { BookOpen, ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "שירותים - מחולל הקהילות",
  description: "רשימת השירותים הקהילתיים שלנו.",
};

export const revalidate = 3600;

export default async function ServicesCategory() {
  const globalSettings = await getGlobalSettings("1");
  let pages: any[] = [];
  
  try {
    const snap = await adminDb.collection("services").get();
    pages = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.error(e);
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar layout={globalSettings.headerLayout} logoUrl={globalSettings.siteLogoUrl} navLinks={globalSettings.navLinks} />
      
      <main className="flex-grow container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-white mb-4">
            שירותי הקהילה
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            אנו מספקים מגוון רחב של שירותים לכלל האוכלוסייה
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {pages.map((p: any) => (
            <Link key={p.id} href={`/service/${p.id}`} className="group relative block overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="h-48 overflow-hidden bg-slate-100 dark:bg-slate-700 relative">
                {p.hero?.imageSrc ? (
                  <img src={p.hero.imageSrc} alt={p.hero?.title || p.id} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <BookOpen className="w-16 h-16" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                  <span className="text-white font-medium flex items-center gap-2">
                    קרא עוד <ArrowLeft className="w-4 h-4" />
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{p.hero?.title || p.seo?.title || p.id}</h3>
                <p className="text-slate-600 dark:text-slate-400 line-clamp-2 text-sm">{p.hero?.description || p.seo?.description || "לחץ למידע נוסף על השירות שלנו."}</p>
              </div>
            </Link>
          ))}
          {pages.length === 0 && (
            <div className="col-span-full text-center py-20 text-slate-500">
              עדיין אין שירותים פעילים במערכת.
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
