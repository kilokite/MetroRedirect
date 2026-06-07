export type ThemeMode = "auto" | "manual"

const THEME_MODE_KEY = "url-redirect-theme-mode"

/** 6:00–18:00 浅色，其余时间深色 */
export function getTimeBasedTheme(): "light" | "dark" {
  const hour = new Date().getHours()
  return hour >= 6 && hour < 18 ? "light" : "dark"
}

export function getThemeMode(): ThemeMode {
  const stored = localStorage.getItem(THEME_MODE_KEY)
  return stored === "manual" ? "manual" : "auto"
}

export function setThemeMode(mode: ThemeMode) {
  localStorage.setItem(THEME_MODE_KEY, mode)
}
