import { adminDb } from "@/lib/firebase-admin";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getGlobalSettings } from "@/features/settings/actions";
import { LayoutTemplate, ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "עמודי נחיתה - מחולל הקהילות",
  description: "כל עמודי הנחיתה של קהילת מחולל הקהילות במקום אחד.",
};

export const revalidate = 3600; // Revalidate every hour

import { staticLandingPages } from "@/data/landing-pages";

export default async function LandingPagesCategory() {
  const globalSettings = await getGlobalSettings("1");
  let pages: any[] = [];
  
  try {
    const snap = await adminDb.collection("landing").get();
    pages = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.error(e);
  }

  // Merge static fallbacks if they don't exist in DB
  const existingIds = new Set(pages.map((p: any) => p.id));
  staticLandingPages.forEach(sp => {
    if (!existingIds.has(sp.id)) {
      pages.push(sp);
    }
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar layout={globalSettings.headerLayout} logoUrl={globalSettings.siteLogoUrl} navLinks={globalSettings.navLinks} />
      
      <main className="flex-grow container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-white mb-4">
            עמודי נחיתה
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            גלו את מגוון אפשרויות ההרשמה והפעילויות שלנו
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {pages.map((p: any) => (
            <Link key={p.id} href={`/landing/${p.id}`} className="group relative block overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="h-48 overflow-hidden bg-slate-100 dark:bg-slate-700 relative">
                {p.hero?.imageSrc ? (
                  <img src={p.hero.imageSrc} alt={p.hero?.title || p.id} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <LayoutTemplate className="w-16 h-16" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                  <span className="text-white font-medium flex items-center gap-2">
                    צפה בעמוד <ArrowLeft className="w-4 h-4" />
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{p.hero?.title || p.seo?.title || p.id}</h3>
                <p className="text-slate-600 dark:text-slate-400 line-clamp-2 text-sm">{p.hero?.description || p.seo?.description || "לחץ לצפייה בפרטים המלאים והרשמה"}</p>
              </div>
            </Link>
          ))}
          {pages.length === 0 && (
            <div className="col-span-full text-center py-20 text-slate-500">
              עדיין אין עמודי נחיתה פעילים במערכת.
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
