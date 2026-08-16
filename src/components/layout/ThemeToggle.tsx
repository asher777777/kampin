"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    // Read the current class on mount
    const hasDark = document.documentElement.classList.contains("dark");
    setTheme(hasDark ? "dark" : "light");
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

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors w-full text-right cursor-pointer"
      type="button"
    >
      {theme === "dark" ? (
        <>
          <Sun className="w-5 h-5 text-amber-500" />
          <span>מצב בהיר (Light Mode)</span>
        </>
      ) : (
        <>
          <Moon className="w-5 h-5 text-amber-500" />
          <span>מצב כהה (Dark Mode)</span>
        </>
      )}
    </button>
  );
}
