import { useCallback, useEffect, useState } from "react"
import { RefreshCwIcon } from "lucide-react"
import { toast } from "sonner"
import { api, ApiError, type MemoryProbe } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function SettingsPage() {
  const { logout } = useAuth()
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [memory, setMemory] = useState<MemoryProbe | null>(null)
  const [memoryRefreshing, setMemoryRefreshing] = useState(false)

  const loadMemory = useCallback(async (silent = false) => {
    if (silent) setMemoryRefreshing(true)
    try {
      const data = await api.getMemoryProbe()
      setMemory(data)
    } catch (error) {
      if (!silent) {
        const message =
          error instanceof ApiError ? error.message : "获取内存信息失败"
        toast.error(message)
      }
    } finally {
      setMemoryRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadMemory()
    const timer = window.setInterval(() => {
      void loadMemory(true)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [loadMemory])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error("两次输入的新密码不一致")
      return
    }

    if (newPassword.length < 4) {
      toast.error("新密码至少 4 个字符")
      return
    }

    setLoading(true)
    try {
      await api.changePassword(oldPassword, newPassword)
      toast.success("密码已更新，请重新登录")
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
      logout()
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "修改失败，请重试"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">设置</h1>
        <p className="text-sm text-muted-foreground">
          修改管理员密码，保存后需重新登录
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {memory ? (
            <span>
              内存 {memory.rss} · 虚拟 {memory.virtual_memory} · PID {memory.pid}
            </span>
          ) : (
            <span>内存加载中…</span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={memoryRefreshing}
            onClick={() => void loadMemory()}
            aria-label="刷新内存信息"
            className="text-muted-foreground"
          >
            <RefreshCwIcon className={memoryRefreshing ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div className="space-y-2">
          <Label htmlFor="old_password">当前密码</Label>
          <Input
            id="old_password"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new_password">新密码</Label>
          <Input
            id="new_password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm_password">确认新密码</Label>
          <Input
            id="confirm_password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
          {loading ? "保存中..." : "保存"}
        </Button>
      </form>
    </div>
  )
}
