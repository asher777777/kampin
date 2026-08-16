"use client";

import Link from "next/link";
import { CheckCircle2, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PricingPackage } from "@/features/home/actions";

interface PricingSectionProps {
  id?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  packages?: PricingPackage[];
  isEditing?: boolean;
  onUpdate?: (field: "title" | "subtitle" | "description" | "packages", val: any) => void;
}

export function PricingSection({
  id = "pricing",
  title = "חבילות משתלמות",
  subtitle = "בחר את החבילה המתאימה ביותר לצרכים של הקהילה שלך",
  description = "",
  packages = [],
  isEditing = false,
  onUpdate
}: PricingSectionProps) {
  
  const updatePackage = (index: number, field: keyof PricingPackage, value: any) => {
    if (!onUpdate) return;
    const newPackages = [...packages];
    newPackages[index] = { ...newPackages[index], [field]: value };
    onUpdate("packages", newPackages);
  };

  const updateFeature = (pkgIndex: number, featureIndex: number, value: string) => {
    if (!onUpdate) return;
    const newPackages = [...packages];
    const newFeatures = [...newPackages[pkgIndex].features];
    newFeatures[featureIndex] = value;
    newPackages[pkgIndex] = { ...newPackages[pkgIndex], features: newFeatures };
    onUpdate("packages", newPackages);
  };

  const removeFeature = (pkgIndex: number, featureIndex: number) => {
    if (!onUpdate) return;
    const newPackages = [...packages];
    const newFeatures = newPackages[pkgIndex].features.filter((_, i) => i !== featureIndex);
    newPackages[pkgIndex] = { ...newPackages[pkgIndex], features: newFeatures };
    onUpdate("packages", newPackages);
  };

  const addFeature = (pkgIndex: number) => {
    if (!onUpdate) return;
    const newPackages = [...packages];
    const newFeatures = [...newPackages[pkgIndex].features, "תכונה חדשה"];
    newPackages[pkgIndex] = { ...newPackages[pkgIndex], features: newFeatures };
    onUpdate("packages", newPackages);
  };

  const renderPackage = (pkg: PricingPackage, index: number) => {
    const isPro = pkg.isPopular;
    const baseClasses = isPro
      ? "flex flex-col p-8 glass rounded-3xl border-2 border-primary-500 relative transform lg:-translate-y-4 shadow-xl shadow-primary-500/10"
      : "flex flex-col p-8 glass rounded-3xl border border-foreground/10 relative";

    return (
      <div key={pkg.id || index} className={baseClasses}>
        {isPro && (
          <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-500 px-3 py-1 text-sm font-medium text-white">
            המומלץ ביותר
          </div>
        )}

        {isEditing ? (
          <input
            type="text"
            value={pkg.title}
            onChange={(e) => updatePackage(index, "title", e.target.value)}
            className="text-2xl font-bold bg-transparent border-b border-dashed border-primary-300 focus:outline-none focus:border-primary-500 w-full"
            dir="rtl"
          />
        ) : (
          <h3 className="text-2xl font-bold">{pkg.title}</h3>
        )}

        <div className="mt-4 flex items-baseline text-5xl font-extrabold gap-1" dir="rtl">
          {isEditing ? (
            <>
              <input
                type="text"
                value={pkg.price}
                onChange={(e) => updatePackage(index, "price", e.target.value)}
                className="w-24 bg-transparent border-b border-dashed border-primary-300 focus:outline-none focus:border-primary-500"
              />
              <input
                type="text"
                value={pkg.period}
                onChange={(e) => updatePackage(index, "period", e.target.value)}
                className="w-16 text-xl font-medium text-foreground/60 bg-transparent border-b border-dashed border-primary-300 focus:outline-none focus:border-primary-500"
              />
            </>
          ) : (
            <>
              {pkg.price}
              <span className="text-xl font-medium text-foreground/60">{pkg.period}</span>
            </>
          )}
        </div>

        {isEditing ? (
          <input
            type="text"
            value={pkg.description}
            onChange={(e) => updatePackage(index, "description", e.target.value)}
            className="mt-4 text-foreground/70 bg-transparent border-b border-dashed border-primary-300 focus:outline-none focus:border-primary-500 w-full"
            dir="rtl"
          />
        ) : (
          <p className="mt-4 text-foreground/70">{pkg.description}</p>
        )}

        <ul className="mt-8 space-y-4 flex-1">
          {pkg.features.map((feature, fIndex) => (
            <li key={fIndex} className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary-500 shrink-0" />
              {isEditing ? (
                <div className="flex items-center gap-2 w-full">
                  <input
                    type="text"
                    value={feature}
                    onChange={(e) => updateFeature(index, fIndex, e.target.value)}
                    className="flex-1 bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-primary-500"
                    dir="rtl"
                  />
                  <button onClick={() => removeFeature(index, fIndex)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <span>{feature}</span>
              )}
            </li>
          ))}
          {isEditing && (
            <li>
              <button onClick={() => addFeature(index)} className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 mt-2">
                <Plus className="w-4 h-4" /> הוסף תכונה
              </button>
            </li>
          )}
        </ul>

        {isEditing ? (
          <input
            type="text"
            value={pkg.buttonText}
            onChange={(e) => updatePackage(index, "buttonText", e.target.value)}
            className={cn(
              "mt-8 w-full inline-flex h-12 items-center justify-center rounded-full text-base font-medium text-center focus:outline-none",
              isPro 
                ? "bg-primary-600 text-white shadow-lg shadow-primary-500/25 border border-transparent" 
                : "border border-foreground/20 bg-transparent text-foreground"
            )}
            dir="rtl"
          />
        ) : (
          <Link href={pkg.buttonLink || "#"} className={cn(
            "mt-8 w-full inline-flex h-12 items-center justify-center rounded-full text-base font-medium transition-colors",
            isPro
              ? "bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-500/25"
              : "border border-foreground/20 bg-transparent hover:bg-foreground/5 text-foreground"
          )}>
            {pkg.buttonText}
          </Link>
        )}
      </div>
    );
  };

  return (
    <section id={id} className="w-full py-20 bg-background relative">
      <div className="container px-4 md:px-6 mx-auto relative z-10">
        <div className="text-center mb-16">
          {isEditing ? (
            <input
              type="text"
              value={title}
              onChange={(e) => onUpdate?.("title", e.target.value)}
              className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center bg-transparent border-b border-dashed border-primary-300 focus:outline-none focus:border-primary-500 max-w-2xl mx-auto w-full"
              placeholder="כותרת אזור תמחור"
              dir="rtl"
            />
          ) : (
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">{title}</h2>
          )}
          
          {isEditing ? (
            <input
              type="text"
              value={subtitle}
              onChange={(e) => onUpdate?.("subtitle", e.target.value)}
              className="mt-4 text-lg text-foreground/70 text-center bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-slate-500 max-w-2xl mx-auto w-full block"
              placeholder="כותרת משנה לתמחור"
              dir="rtl"
            />
          ) : subtitle && (
            <p className="mt-4 text-lg text-foreground/70 max-w-[600px] mx-auto">
              {subtitle}
            </p>
          )}

          {isEditing ? (
            <textarea
              value={description || ""}
              onChange={(e) => onUpdate?.("description", e.target.value)}
              className="mt-2 text-md text-foreground/60 text-center bg-transparent border border-dashed border-slate-200 rounded p-2 focus:outline-none focus:border-slate-400 max-w-2xl mx-auto w-full block"
              placeholder="תיאור נוסף (אופציונלי)"
              dir="rtl"
            />
          ) : description && (
            <p className="mt-2 text-md text-foreground/60 max-w-[600px] mx-auto">
              {description}
            </p>
          )}
        </div>
        
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {packages && packages.length > 0 ? (
            packages.map((pkg, idx) => renderPackage(pkg, idx))
          ) : (
            <div className="col-span-full text-center text-slate-500 py-10">
              אין חבילות להצגה.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
