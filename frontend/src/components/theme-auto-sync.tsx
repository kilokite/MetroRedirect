import { useEffect } from "react"
import { useTheme } from "next-themes"
import { getThemeMode, getTimeBasedTheme, setThemeMode } from "@/lib/theme-time"

const SYNC_INTERVAL_MS = 60_000

export function ThemeAutoSync() {
  const { setTheme } = useTheme()

  useEffect(() => {
    const stored = localStorage.getItem("theme")
    if (stored === "system") {
      localStorage.removeItem("theme")
      setThemeMode("auto")
    }

    const sync = () => {
      if (getThemeMode() !== "auto") return
      setTheme(getTimeBasedTheme())
    }

    sync()
    const interval = window.setInterval(sync, SYNC_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [setTheme])

  return null
}
