import { useCallback, useEffect, useState } from "react"
import { PlusIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { api, ApiError, type Domain } from "@/lib/api"
import { DomainFormDialog } from "@/components/domains/domain-form-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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

function formatDate(value: string) {
  return new Date(value).toLocaleString("zh-CN")
}

export function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null)
  const [deletingDomain, setDeletingDomain] = useState<Domain | null>(null)

  const loadDomains = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.listDomains()
      setDomains(data)
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "加载域名失败"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDomains()
  }, [loadDomains])

  const handleDelete = async () => {
    if (!deletingDomain) return
    try {
      await api.deleteDomain(deletingDomain.id)
      toast.success("域名已删除")
      setDeletingDomain(null)
      loadDomains()
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.status === 409
            ? "该域名下仍有短链，无法删除"
            : error.message
          : "删除失败"
      toast.error(message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">域名</h1>
          <p className="text-sm text-muted-foreground">管理短链绑定的域名</p>
        </div>
        <Button
          className="w-full sm:w-auto"
          onClick={() => {
            setEditingDomain(null)
            setDialogOpen(true)
          }}
        >
          <PlusIcon />
          新建域名
        </Button>
      </div>

      <div className="space-y-3 md:hidden">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-lg border p-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))
        ) : domains.length === 0 ? (
          <div className="rounded-lg border py-12 text-center text-muted-foreground">
            暂无域名
          </div>
        ) : (
          domains.map((domain) => (
            <div
              key={domain.id}
              className="flex items-start justify-between gap-3 rounded-lg border p-4"
            >
              <div className="min-w-0 space-y-1">
                <p className="truncate font-medium">{domain.hostname}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {domain.is_default && (
                    <Badge variant="secondary">默认</Badge>
                  )}
                  {domain.is_open && (
                    <Badge variant="outline">开放</Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {formatDate(domain.created_at)}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    setEditingDomain(domain)
                    setDialogOpen(true)
                  }}
                >
                  <PencilIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDeletingDomain(domain)}
                >
                  <Trash2Icon />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hostname</TableHead>
              <TableHead>默认</TableHead>
              <TableHead>开放</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : domains.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  暂无域名
                </TableCell>
              </TableRow>
            ) : (
              domains.map((domain) => (
                <TableRow key={domain.id}>
                  <TableCell className="font-medium">{domain.hostname}</TableCell>
                  <TableCell>
                    {domain.is_default && (
                      <Badge variant="secondary">默认</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {domain.is_open && (
                      <Badge variant="outline">开放</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(domain.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setEditingDomain(domain)
                          setDialogOpen(true)
                        }}
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeletingDomain(domain)}
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DomainFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        domain={editingDomain}
        onSuccess={loadDomains}
      />

      <AlertDialog
        open={!!deletingDomain}
        onOpenChange={(open) => !open && setDeletingDomain(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除域名「{deletingDomain?.hostname}」？
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
