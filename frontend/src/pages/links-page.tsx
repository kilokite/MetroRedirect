import { useCallback, useEffect, useRef, useState } from "react"
import { CheckIcon, CopyIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { api, ApiError, type Domain, type Link } from "@/lib/api"
import { LinkFormDialog } from "@/components/links/link-form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"

function shortUrl(hostname: string, slug: string) {
  return `https://${hostname}/${slug}`
}

const COPY_HOLD_MS = 1500

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const [copyEnterDelay, setCopyEnterDelay] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    toast.success("已复制")
    if (timerRef.current) clearTimeout(timerRef.current)
    setCopyEnterDelay(false)
    setCopied(true)
    timerRef.current = setTimeout(() => {
      setCopied(false)
      setCopyEnterDelay(true)
    }, COPY_HOLD_MS)
  }

  const iconClass =
    "absolute inset-0 size-4 origin-center transition-all ease-in-out duration-150"

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="shrink-0"
      onClick={handleCopy}
    >
      <span className="relative size-4">
        <CopyIcon
          className={cn(
            iconClass,
            copied
              ? "scale-0 opacity-0"
              : copyEnterDelay
                ? "scale-100 opacity-100 delay-150"
                : "scale-100 opacity-100",
          )}
        />
        <CheckIcon
          className={cn(
            iconClass,
            "text-green-600",
            copied
              ? "scale-100 opacity-100 delay-150"
              : "scale-0 opacity-0",
          )}
        />
      </span>
    </Button>
  )
}

function CopyableUrl({ url }: { url: string }) {
  return (
    <div className="inline-flex max-w-full items-center gap-1">
      <span
        className="max-w-xs truncate font-mono text-sm sm:max-w-sm lg:max-w-md"
        title={url}
      >
        {url}
      </span>
      <CopyButton text={url} />
    </div>
  )
}

export function LinksPage() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [links, setLinks] = useState<Link[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [domainFilter, setDomainFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingLink, setEditingLink] = useState<Link | null>(null)
  const [deletingLink, setDeletingLink] = useState<Link | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const loadDomains = useCallback(async () => {
    try {
      const data = await api.listDomains()
      setDomains(data)
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "加载域名失败"
      toast.error(message)
    }
  }, [])

  const loadLinks = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.listLinks({
        domain_id: domainFilter === "all" ? undefined : Number(domainFilter),
        q: debouncedSearch || undefined,
        page: 1,
        limit: 50,
      })
      setLinks(data.items)
      setTotal(data.total)
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "加载短链失败"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [domainFilter, debouncedSearch])

  useEffect(() => {
    loadDomains()
  }, [loadDomains])

  useEffect(() => {
    loadLinks()
  }, [loadLinks])

  const domainMap = new Map(domains.map((d) => [d.id, d.hostname]))

  const handleDelete = async () => {
    if (!deletingLink) return
    try {
      await api.deleteLink(deletingLink.id)
      toast.success("短链已删除")
      setDeletingLink(null)
      loadLinks()
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "删除失败"
      toast.error(message)
    }
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">短链</h1>
          <p className="text-sm text-muted-foreground">共 {total} 条记录</p>
        </div>
        <Button
          className="w-full sm:w-auto"
          onClick={() => {
            setEditingLink(null)
            setDialogOpen(true)
          }}
        >
          <PlusIcon />
          新建短链
        </Button>
      </div>

      <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row">
        <div className="w-full shrink-0 sm:w-48">
          <Select value={domainFilter} onValueChange={setDomainFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="全部域名" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="all">全部域名</SelectItem>
              {domains.map((domain) => (
                <SelectItem key={domain.id} value={String(domain.id)}>
                  {domain.hostname}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          className="w-full min-w-0 sm:max-w-xs"
          placeholder="搜索短链或备注"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3 md:hidden">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-lg border p-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))
        ) : links.length === 0 ? (
          <div className="rounded-lg border py-12 text-center text-muted-foreground">
            暂无短链
          </div>
        ) : (
          links.map((link) => {
            const hostname = domainMap.get(link.domain_id) ?? "unknown"
            const url = shortUrl(hostname, link.slug)
            return (
              <div key={link.id} className="space-y-3 rounded-lg border p-4">
                <CopyableUrl url={url} />
                <p
                  className="truncate text-sm text-muted-foreground"
                  title={link.target_url}
                >
                  {link.title ?? link.target_url}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={link.enabled ? "default" : "outline"}>
                      {link.enabled ? "启用" : "禁用"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {link.click_count} 次点击
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        setEditingLink(link)
                        setDialogOpen(true)
                      }}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeletingLink(link)}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>短链</TableHead>
              <TableHead>目标 URL</TableHead>
              <TableHead className="text-right">点击</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : links.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  暂无短链
                </TableCell>
              </TableRow>
            ) : (
              links.map((link) => {
                const hostname = domainMap.get(link.domain_id) ?? "unknown"
                return (
                  <TableRow key={link.id}>
                    <TableCell>
                      <CopyableUrl url={shortUrl(hostname, link.slug)} />
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={link.target_url}>
                      {link.title ?? link.target_url}
                    </TableCell>
                    <TableCell className="text-right">{link.click_count}</TableCell>
                    <TableCell>
                      <Badge variant={link.enabled ? "default" : "outline"}>
                        {link.enabled ? "启用" : "禁用"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setEditingLink(link)
                            setDialogOpen(true)
                          }}
                        >
                          <PencilIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeletingLink(link)}
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <LinkFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        domains={domains}
        link={editingLink}
        onSuccess={loadLinks}
      />

      <AlertDialog
        open={!!deletingLink}
        onOpenChange={(open) => !open && setDeletingLink(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除短链「
              {deletingLink
                ? shortUrl(
                    domainMap.get(deletingLink.domain_id) ?? "unknown",
                    deletingLink.slug,
                  )
                : ""}
              」？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
