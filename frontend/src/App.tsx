import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { ThemeAutoSync } from "@/components/theme-auto-sync"
import { ThemeProvider } from "@/components/theme-provider"
import { getTimeBasedTheme } from "@/lib/theme-time"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppShell } from "@/components/layout/app-shell"
import {
  AuthProvider,
  ProtectedRoute,
  PublicRoute,
} from "@/lib/auth"
import { LoginPage } from "@/pages/login-page"
import { CreateLinkPage } from "@/pages/create-link-page"
import { LinksPage } from "@/pages/links-page"
import { DomainsPage } from "@/pages/domains-page"
import { SettingsPage } from "@/pages/settings-page"

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme={getTimeBasedTheme()} enableSystem={false}>
      <ThemeAutoSync />
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
          <Routes>
            <Route path="/" element={<CreateLinkPage />} />
            <Route path="/create" element={<Navigate to="/" replace />} />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<LinksPage />} />
              <Route path="domains" element={<DomainsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
            <Toaster richColors closeButton />
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
