"use client";

import { useEffect, useRef } from "react";
import { incrementPageView } from "@/features/services/actions";

export function PageViewTracker({ slug, collectionName = "services" }: { slug: string, collectionName?: string }) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!hasTracked.current && slug) {
      hasTracked.current = true;
      incrementPageView(slug, collectionName).catch(console.error);
    }
  }, [slug, collectionName]);

  return null;
}
