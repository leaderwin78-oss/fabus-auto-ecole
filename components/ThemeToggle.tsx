"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = (localStorage.getItem("theme") as Theme | null) ?? "system";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads persisted preference on mount, not a render loop
    setTheme(stored);
  }, []);

  function cycle() {
    const order: Theme[] = ["light", "dark", "system"];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
    localStorage.setItem("theme", next);
    applyTheme(next);
  }

  const icon = theme === "light" ? "fa-sun" : theme === "dark" ? "fa-moon" : "fa-circle-half-stroke";
  const label = theme === "light" ? "Mode clair" : theme === "dark" ? "Mode sombre" : "Thème système";

  return (
    <button className="theme-toggle" onClick={cycle} title={label} aria-label={label}>
      <i className={`fa-solid ${icon}`}></i>
    </button>
  );
}
