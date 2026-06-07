import { useCallback, useEffect, useState } from "react"
import { ArrowRightIcon, CheckIcon, CopyIcon, XIcon } from "lucide-react"
import { toast } from "sonner"
import { api, ApiError, type PublicDomain } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Phase = "input" | "loading" | "result"

export function CreateLinkPage() {
  const [domains, setDomains] = useState<PublicDomain[]>([])
  const [loadingDomains, setLoadingDomains] = useState(true)
  const [hostname, setHostname] = useState("")
  const [inputValue, setInputValue] = useState("")
  const [phase, setPhase] = useState<Phase>("input")
  const [copied, setCopied] = useState(false)

  const loadDomains = useCallback(async () => {
    setLoadingDomains(true)
    try {
      const data = await api.listOpenDomains()
      setDomains(data)
      if (data.length === 1) {
        setHostname(data[0].hostname)
      }
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "加载域名失败"
      toast.error(message)
    } finally {
      setLoadingDomains(false)
    }
  }, [])

  useEffect(() => {
    loadDomains()
  }, [loadDomains])

  const canCreate =
    phase === "input" &&
    !!hostname &&
    inputValue.trim().length > 0 &&
    !loadingDomains

  const handleInputChange = (value: string) => {
    if (phase === "result") {
      setPhase("input")
    }
    setInputValue(value)
    setCopied(false)
  }

  const handleClear = () => {
    setPhase("input")
    setInputValue("")
    setCopied(false)
  }

  const handleCreate = async () => {
    if (!canCreate) return

    const targetUrl = inputValue.trim()
    setPhase("loading")

    try {
      const result = await api.createPublicLink({
        hostname,
        target_url: targetUrl,
      })
      setInputValue(result.short_url)
      setPhase("result")
    } catch (error) {
      setPhase("input")
      const message =
        error instanceof ApiError ? error.message : "创建失败，请重试"
      toast.error(message)
    }
  }

  const handleCopy = async () => {
    if (phase !== "result" || !inputValue) return
    try {
      await navigator.clipboard.writeText(inputValue)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("复制失败")
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && canCreate) {
      event.preventDefault()
      void handleCreate()
    }
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center p-6">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="flex w-full max-w-lg flex-col items-center gap-10 md:max-w-2xl">
        <img src="/logo.svg" alt="Logo" className="h-22 w-auto select-none" />

        {loadingDomains ? (
          <div className="h-24 w-full animate-pulse rounded-lg bg-muted/40" />
        ) : domains.length === 0 ? (
          <p className="text-sm text-muted-foreground">当前没有开放创建的域名</p>
        ) : (
          <div className="flex w-full flex-col gap-5">
            <div
              className={cn(
                "flex w-full flex-col gap-3",
                domains.length > 1 && "md:flex-row md:items-center md:gap-2",
              )}
            >
              {domains.length > 1 && (
                <Select value={hostname} onValueChange={setHostname}>
                  <SelectTrigger
                    className={cn(
                      "h-11 w-full border-0 border-b border-input rounded-none bg-transparent px-0 shadow-none focus-visible:ring-0",
                      "md:w-auto md:max-w-[11rem] md:min-w-[8rem] md:shrink-0 md:rounded-lg md:border md:border-input md:px-3 md:shadow-xs",
                    )}
                  >
                    <SelectValue placeholder="选择域名" />
                  </SelectTrigger>
                  <SelectContent>
                    {domains.map((domain) => (
                      <SelectItem key={domain.hostname} value={domain.hostname}>
                        {domain.hostname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <input
                  type={phase === "result" ? "text" : "url"}
                  value={inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onFocus={(e) => {
                    if (phase === "result") {
                      e.currentTarget.select()
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  readOnly={phase === "loading"}
                  placeholder="链接变短！"
                  className={cn(
                    "h-11 w-full rounded-lg border border-input bg-transparent px-4 text-base shadow-xs outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground md:text-sm",
                    "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    phase === "result" && "font-medium",
                    phase === "loading" && "text-transparent caret-transparent",
                  )}
                />
                <div
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-0 overflow-hidden rounded-lg transition-opacity duration-500 ease-out",
                    phase === "loading" ? "opacity-100" : "opacity-0",
                  )}
                >
                  <div className="create-link-gradient-overlay size-full" />
                </div>
              </div>

              <div
                className={cn(
                  "flex shrink-0 items-center gap-1 overflow-hidden transition-all duration-300 ease-out",
                  phase === "result"
                    ? "max-w-[5rem] opacity-100"
                    : "max-w-0 opacity-0",
                )}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className={cn(
                    "shrink-0 transition-all duration-300 ease-out",
                    phase === "result"
                      ? "translate-x-0 scale-100 opacity-100 delay-75"
                      : "translate-x-2 scale-90 opacity-0",
                  )}
                  onClick={() => void handleCopy()}
                  aria-label="复制短链"
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className={cn(
                    "shrink-0 transition-all duration-300 ease-out",
                    phase === "result"
                      ? "translate-x-0 scale-100 opacity-100 delay-150"
                      : "translate-x-2 scale-90 opacity-0",
                  )}
                  onClick={handleClear}
                  aria-label="清空"
                >
                  <XIcon />
                </Button>
              </div>
              </div>
            </div>

            <div
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                canCreate
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <button
                  type="button"
                  disabled={!canCreate}
                  onClick={() => void handleCreate()}
                  aria-label="创建短链"
                  className={cn(
                    "mx-auto flex size-11 items-center justify-center rounded-full transition-all duration-300 ease-out",
                    "hover:brightness-105 active:scale-[0.98]",
                    "disabled:pointer-events-none disabled:opacity-50",
                    canCreate
                      ? "translate-y-0 scale-100"
                      : "translate-y-1 scale-[0.98]",
                  )}
                  style={{
                    background:
                      "linear-gradient(106.78deg, #FF9DDB 11.09%, #FFDF80 96.06%)",
                  }}
                >
                  <ArrowRightIcon className="size-5 text-white" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
