"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Read the current class or local storage on mount
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
      setTheme("light");
    } else {
      document.documentElement.classList.add("dark");
      setTheme("dark");
    }
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (theme === "dark") {
      html.classList.remove("dark");
      setTheme("light");
      localStorage.setItem("theme", "light");
    } else {
      html.classList.add("dark");
      setTheme("dark");
      localStorage.setItem("theme", "dark");
    }
  };

  if (!mounted) {
    return (
      <div className="h-11 w-full rounded-xl bg-slate-800/40 animate-pulse" />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-slate-700/60 dark:border-slate-800 bg-slate-800/40 dark:bg-slate-900/80 hover:bg-slate-800 dark:hover:bg-slate-800 text-slate-200 dark:text-slate-300 hover:text-white transition-all w-full cursor-pointer group"
      type="button"
      title={theme === "dark" ? "מעבר למצב יום" : "מעבר למצב לילה"}
    >
      <div className="flex items-center gap-2.5">
        {theme === "dark" ? (
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition-colors">
            <Sun className="w-4 h-4" />
          </div>
        ) : (
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
            <Moon className="w-4 h-4" />
          </div>
        )}
        <span className="text-xs font-bold whitespace-nowrap">
          {theme === "dark" ? "מצב יום" : "מצב לילה"}
        </span>
      </div>

      <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">
        {theme === "dark" ? "כהה פעיל" : "בהיר פעיל"}
      </span>
    </button>
  );
}
