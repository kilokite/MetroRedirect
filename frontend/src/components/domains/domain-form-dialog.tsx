import { useEffect, useState } from "react"
import { toast } from "sonner"
import { api, ApiError, type Domain } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

type DomainFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  domain?: Domain | null
  onSuccess: () => void
}

export function DomainFormDialog({
  open,
  onOpenChange,
  domain,
  onSuccess,
}: DomainFormDialogProps) {
  const isEdit = !!domain
  const [hostname, setHostname] = useState("")
  const [isDefault, setIsDefault] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    if (domain) {
      setHostname(domain.hostname)
      setIsDefault(domain.is_default)
      setIsOpen(domain.is_open)
    } else {
      setHostname("")
      setIsDefault(false)
      setIsOpen(false)
    }
  }, [open, domain])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    try {
      if (isEdit && domain) {
        await api.updateDomain(domain.id, {
          hostname,
          is_default: isDefault,
          is_open: isOpen,
        })
        toast.success("域名已更新")
      } else {
        await api.createDomain({
          hostname,
          is_default: isDefault,
          is_open: isOpen,
        })
        toast.success("域名已创建")
      }
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "操作失败，请重试"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑域名" : "新建域名"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hostname">Hostname</Label>
            <Input
              id="hostname"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              placeholder="s.example.com"
              required
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="is_default">设为默认域名</Label>
            <Switch
              id="is_default"
              checked={isDefault}
              onCheckedChange={setIsDefault}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_open">开放创建</Label>
              <p className="text-xs text-muted-foreground">
                开启后无需登录即可创建短链
              </p>
            </div>
            <Switch
              id="is_open"
              checked={isOpen}
              onCheckedChange={setIsOpen}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
