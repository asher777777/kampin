"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getAllPosts } from "@/features/posts/actions";
import { getAllSitePages } from "@/features/home/actions";

interface LivePostsGridProps {
  id?: string;
  layout?: "grid" | "carousel" | "list" | "bento";
  customPages?: string[];
  title?: string;
  titleColor?: string;
  description?: string;
  descriptionColor?: string;
}

export function LivePostsGrid({ id, layout = "grid", customPages, title, titleColor, description, descriptionColor }: LivePostsGridProps) {
  const [displayItems, setDisplayItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        if (customPages && customPages.length > 0) {
          const allPages = await getAllSitePages();
          const fixedPages = [
            { id: "home", title: 'עמוד הבית', url: '/', description: 'עמוד הבית של האתר', imageSrc: '/placeholder.png' },
            { id: "lessons", title: 'שיעורי תורה', url: '/lessons', description: 'שיעורי תורה והרצאות', imageSrc: '/placeholder.png' },
            { id: "services", title: 'שירותי דת', url: '/services', description: 'שירותי דת שונים', imageSrc: '/placeholder.png' },
            { id: "community", title: 'עמוד קהילה', url: '/community', description: 'פעילות הקהילה', imageSrc: '/placeholder.png' },
            { id: "contact", title: 'צור קשר', url: '/contact', description: 'צור קשר עמנו', imageSrc: '/placeholder.png' },
          ];
          const combinedPages = [...fixedPages, ...allPages];
          
          // Map customPages array to matching elements in combinedPages (by URL)
          const matched = customPages
            .map(url => combinedPages.find(p => p.url === url))
            .filter(Boolean)
            .map((p: any) => ({
              id: p!.id,
              title: p!.title,
              description: p!.description || "עבור לדף לקריאת פרטים נוספים.",
              url: p!.url,
              imageSrc: p!.imageSrc || "",
              category: p!.url.startsWith("/service") ? "שירות" : (p!.url.startsWith("/post") ? "בלוג" : "עמוד"),
              createdAt: new Date()
            }));
          setDisplayItems(matched);
        } else {
          setDisplayItems([]);
        }
      } catch (err) {
        console.warn("Failed to fetch homepage listing data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [customPages]);

  if (loading) {
    return (
      <section className="py-20 bg-slate-50/50" dir="rtl">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 text-sm">טוען עדכוני קהילה...</p>
        </div>
      </section>
    );
  }

  if (displayItems.length === 0) {
    return null;
  }

  return (
    <section id={id} className="py-24 bg-gradient-to-b from-[#fafbfc] to-white relative overflow-hidden" dir="rtl">
      {/* Decorative ambient gradients */}
      <div className="absolute right-0 top-1/4 w-[350px] h-[350px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute left-0 bottom-1/4 w-[300px] h-[300px] bg-secondary/5 rounded-full blur-[70px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 relative z-10 space-y-16">
        
        {/* Header Block */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: titleColor || '#1e293b' }}>
            {title || "חדשות ועדכונים מהקהילה"}
          </h2>
          <p className="text-sm sm:text-base leading-relaxed" style={{ color: descriptionColor || '#475569' }}>
            {description || "שיעורי תורה, הודעות חשובות, הלכות יומיות ואירועים חמים בקהילה שלנו."}
          </p>
        </div>

        {/* Layout Render */}
        {layout === "grid" && (
          <div className="flex flex-wrap justify-center gap-8 w-full">
            {displayItems.map((item, index) => {
              const isGradient = item.imageSrc?.startsWith("linear-gradient");
              return (
                <div key={index} className="w-full md:w-[calc(33.333%-1.333rem)]">
                <motion.div
                  key={item.id || index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="group bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-lg shadow-slate-100/50 hover:shadow-xl hover:shadow-slate-200/50 hover:border-slate-200 transition-all duration-300 flex flex-col h-full text-right"
                >
                  <div className="h-48 w-full relative flex flex-col justify-end p-5 text-white overflow-hidden shrink-0">
                    {isGradient ? (
                      <div className="absolute inset-0 z-0" style={{ background: item.imageSrc }} />
                    ) : item.imageSrc ? (
                      <Image
                        src={item.imageSrc}
                        alt={item.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105 z-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 z-0" />
                    )}

                    {!isGradient && item.imageSrc && (
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/20 to-transparent transition-opacity group-hover:opacity-75 z-10" />
                    )}

                    <div className="relative z-20 flex items-center justify-between w-full">
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-white/20 backdrop-blur-md border-white/20">
                        {item.category}
                      </span>
                      <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.createdAt).toLocaleDateString("he-IL", {
                          day: "numeric",
                          month: "numeric"
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 flex flex-col justify-between flex-grow gap-5">
                    <div className="space-y-2">
                      <h3 className="font-extrabold text-slate-800 text-lg group-hover:text-primary transition-colors duration-200 line-clamp-1 leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-slate-600 text-sm line-clamp-3 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="border-t pt-4 flex justify-start">
                      <Link
                        href={item.url}
                        className="inline-flex items-center gap-1 text-sm font-bold text-primary group-hover:text-primary-hover transition-colors cursor-pointer"
                      >
                        <span>קרא עוד</span>
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
                </div>
              );
            })}
          </div>
        )}

        {layout === "list" && (
          <div className="flex flex-col gap-6 max-w-4xl mx-auto">
            {displayItems.map((item, index) => (
              <motion.div
                key={item.id || index}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Link href={item.url}>
                  <div className="flex flex-col sm:flex-row gap-6 p-6 bg-white border border-slate-100 rounded-3xl hover:shadow-xl hover:border-slate-200 transition-all duration-300 items-center text-right group">
                    <div className="relative w-full sm:w-48 h-32 rounded-2xl overflow-hidden shrink-0 bg-slate-55 shadow-inner">
                      {item.imageSrc && !item.imageSrc.startsWith("linear-gradient") ? (
                        <Image src={item.imageSrc} fill className="object-cover transition-transform group-hover:scale-105" alt={item.title} />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10" />
                      )}
                    </div>
                    <div className="flex-grow space-y-2 w-full">
                      <span className="text-[10px] font-bold text-secondary uppercase bg-secondary/5 px-2.5 py-0.5 rounded-full">{item.category}</span>
                      <h3 className="font-extrabold text-slate-800 text-lg group-hover:text-primary transition-colors">{item.title}</h3>
                      <p className="text-slate-600 text-sm line-clamp-2 leading-relaxed">{item.description}</p>
                    </div>
                    <ArrowLeft className="h-5 w-5 text-primary shrink-0 hidden sm:block group-hover:-translate-x-1.5 transition-transform" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {layout === "bento" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {displayItems.map((item, index) => {
              const isFirst = index === 0;
              return (
                <motion.div
                  key={item.id || index}
                  className={isFirst ? "md:col-span-2" : "md:col-span-1"}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Link href={item.url}>
                    <div className={`group bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-between text-right h-full ${isFirst ? 'md:flex-row' : ''}`}>
                      <div className={`relative ${isFirst ? 'md:w-1/2 h-64 md:h-auto' : 'h-48'} w-full shrink-0 overflow-hidden`}>
                        {item.imageSrc && !item.imageSrc.startsWith("linear-gradient") ? (
                          <Image src={item.imageSrc} fill className="object-cover transition-transform group-hover:scale-105" alt={item.title} />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10" />
                        )}
                      </div>
                      <div className="p-6 flex flex-col justify-between flex-grow gap-4">
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-secondary uppercase bg-secondary/5 px-2.5 py-0.5 rounded-full inline-block">{item.category}</span>
                          <h3 className="font-black text-slate-800 text-xl leading-snug">{item.title}</h3>
                          <p className="text-slate-600 text-sm line-clamp-3 leading-relaxed">{item.description}</p>
                        </div>
                        <div className="border-t pt-4 flex justify-start text-sm font-bold text-primary">
                          קרא עוד <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}

        {layout === "carousel" && (
          <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-thin snap-x snap-mandatory" style={{ scrollbarWidth: "thin" }}>
            {displayItems.map((item, index) => (
              <motion.div
                key={item.id || index}
                className="w-80 shrink-0 snap-start"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Link href={item.url}>
                  <div className="group bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col text-right h-[380px]">
                    <div className="h-44 w-full relative overflow-hidden shrink-0">
                      {item.imageSrc && !item.imageSrc.startsWith("linear-gradient") ? (
                        <Image src={item.imageSrc} fill className="object-cover transition-transform group-hover:scale-105" alt={item.title} />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10" />
                      )}
                    </div>
                    <div className="p-6 flex flex-col justify-between flex-grow">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-secondary uppercase bg-secondary/5 px-2 py-0.5 rounded-full inline-block">{item.category}</span>
                        <h3 className="font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-primary transition-colors">{item.title}</h3>
                        <p className="text-slate-600 text-xs line-clamp-3 leading-relaxed">{item.description}</p>
                      </div>
                      <div className="text-xs font-bold text-primary mt-2 flex items-center gap-1">
                        קרא עוד <ArrowLeft className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

      </div>
    </section>
  );
}
