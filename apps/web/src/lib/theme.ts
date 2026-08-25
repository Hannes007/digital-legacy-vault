export type Theme = "light" | "dark";

const THEME_COOKIE = "dlv_theme";
const ONE_YEAR_SECONDS = 31_536_000;

/** Applies a theme to the document and persists the choice in a cookie. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.dataset["theme"] = theme;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  document.cookie = `${THEME_COOKIE}=${theme}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}

/** Reads the currently applied theme from the document element. */
export function getCurrentTheme(): Theme {
  return document.documentElement.dataset["theme"] === "dark" ? "dark" : "light";
}

/**
 * Inline script injected in the root layout <head> before paint so the page
 * never flashes the wrong theme. Reads the persisted cookie, falling back to
 * the system preference.
 */
export const themeInitScript = `(function () {
  try {
    var match = document.cookie.match(/(?:^|; )dlv_theme=(dark|light)/);
    var theme = match
      ? match[1]
      : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    var root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  } catch (e) {
    /* default light theme applies */
  }
})();`;
