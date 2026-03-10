"use client";

import { Moon, Sun } from "lucide-react";
import { useStore } from "@/store/index";
import { useEffect, useState } from "react";

export default function AdminThemeToggle() {
  const darkMode = useStore((s) => s.darkMode);
  const setDarkMode = useStore((s) => s.setDarkMode);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <div className="h-9 w-9" />;

  return (
    <button
      type="button"
      aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setDarkMode(!darkMode)}
      className="flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-accent/10 hover:text-accent"
    >
      {darkMode ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}