import { useEffect, useState } from "react"
import { toast } from "sonner"
import { api, ApiError, type Domain, type Link } from "@/lib/api"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

type LinkFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  domains: Domain[]
  link?: Link | null
  onSuccess: () => void
}

export function LinkFormDialog({
  open,
  onOpenChange,
  domains,
  link,
  onSuccess,
}: LinkFormDialogProps) {
  const isEdit = !!link
  const [domainId, setDomainId] = useState("")
  const [slug, setSlug] = useState("")
  const [targetUrl, setTargetUrl] = useState("")
  const [title, setTitle] = useState("")
  const [enabled, setEnabled] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    if (link) {
      setDomainId(String(link.domain_id))
      setSlug(link.slug)
      setTargetUrl(link.target_url)
      setTitle(link.title ?? "")
      setEnabled(link.enabled)
    } else {
      const defaultDomain = domains.find((d) => d.is_default) ?? domains[0]
      setDomainId(defaultDomain ? String(defaultDomain.id) : "")
      setSlug("")
      setTargetUrl("")
      setTitle("")
      setEnabled(true)
    }
  }, [open, link, domains])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!domainId) {
      toast.error("请选择域名")
      return
    }

    setLoading(true)
    try {
      if (isEdit && link) {
        await api.updateLink(link.id, {
          domain_id: Number(domainId),
          slug: slug || undefined,
          target_url: targetUrl,
          title: title || undefined,
          enabled,
        })
        toast.success("短链已更新")
      } else {
        await api.createLink({
          domain_id: Number(domainId),
          target_url: targetUrl,
          slug: slug || undefined,
          title: title || undefined,
          enabled,
        })
        toast.success("短链已创建")
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
          <DialogTitle>{isEdit ? "编辑短链" : "新建短链"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>域名</Label>
            <Select value={domainId} onValueChange={setDomainId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择域名" />
              </SelectTrigger>
              <SelectContent>
                {domains.map((domain) => (
                  <SelectItem key={domain.id} value={String(domain.id)}>
                    {domain.hostname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">短码</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="留空则自动生成"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="target_url">目标 URL</Label>
            <Input
              id="target_url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">备注</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="可选"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="enabled">启用</Label>
            <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
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
