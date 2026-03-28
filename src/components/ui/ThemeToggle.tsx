"use client";

import { useTheme } from "@/components/providers/ThemeProvider";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme, theme } = useTheme();

  function cycle() {
    const next: "light" | "dark" | "system" =
      theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    setTheme(next);
  }

  return (
    <button
      onClick={cycle}
      className="rounded-[8px] p-2 text-muted transition-colors hover:bg-surface-light hover:text-heading"
      aria-label={`Thema: ${theme}. Klik om te wisselen.`}
      title={`Thema: ${theme}`}
    >
      {resolvedTheme === "dark" ? (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.752 15.002A9.718 9.718 0 0112.003 21c-5.385 0-9.75-4.365-9.75-9.75 0-4.518 3.072-8.318 7.245-9.44a.75.75 0 01.955.899 8.25 8.25 0 0011.4 11.393.75.75 0 01.899.9z"
          />
        </svg>
      ) : (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v1.5M12 19.5V21M4.219 4.219l1.061 1.061M17.72 17.72l1.06 1.06M3 12h1.5M19.5 12H21M4.219 19.781l1.061-1.061M17.72 6.28l1.06-1.06"
          />
          <circle cx="12" cy="12" r="3.75" />
        </svg>
      )}
    </button>
  );
}
