import { GlobeIcon, LinkIcon, LogOutIcon, SettingsIcon } from "lucide-react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "@/lib/auth"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { PageTransition } from "@/components/layout/page-transition"
import { ThemeToggle } from "@/components/theme-toggle"

const topBarClass =
  "flex h-14 shrink-0 items-center border-b border-sidebar-border bg-sidebar px-4"

const navItems = [
  { to: "/admin", label: "短链", icon: LinkIcon, end: true },
  { to: "/admin/domains", label: "域名", icon: GlobeIcon },
  { to: "/admin/settings", label: "设置", icon: SettingsIcon },
] as const

function isNavActive(pathname: string, to: string, end?: boolean) {
  if (end) return pathname === to
  return pathname === to || pathname.startsWith(`${to}/`)
}

function SidebarNav() {
  const location = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()

  const closeMobile = () => {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.to}>
          <SidebarMenuButton
            asChild
            isActive={isNavActive(
              location.pathname,
              item.to,
              "end" in item ? item.end : undefined,
            )}
          >
            <NavLink
              to={item.to}
              end={"end" in item ? item.end : undefined}
              onClick={closeMobile}
            >
              <item.icon />
              <span>{item.label}</span>
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}

export function AppShell() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <SidebarProvider>
      <Sidebar className="bg-sidebar">
        <SidebarHeader
          className={`${topBarClass} flex-row items-stretch justify-start py-2`}
        >
          <img
            src="/logo.svg"
            alt="Logo"
            className="h-full w-auto max-w-full object-contain object-left"
          />
        </SidebarHeader>
        <SidebarContent className="bg-sidebar">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarNav />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border bg-sidebar p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start">
                管理员
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={handleLogout}>
                <LogOutIcon />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0">
        <header className={`${topBarClass} gap-3`}>
          <SidebarTrigger />
          <img
            src="/logo.svg"
            alt="Logo"
            className="h-6 w-auto md:hidden"
          />
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <div className="flex-1 p-4 sm:p-6">
          <div className="mx-auto w-full min-w-0 max-w-6xl">
            <PageTransition />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
