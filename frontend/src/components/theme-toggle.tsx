import { MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { setThemeMode } from "@/lib/theme-time"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  const toggle = () => {
    const next = resolvedTheme === "dark" ? "light" : "dark"
    setThemeMode("manual")
    setTheme(next)
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="切换主题"
      onClick={toggle}
    >
      <SunIcon className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <MoonIcon className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
    </Button>
  )
}
