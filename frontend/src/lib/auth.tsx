import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { Navigate, useLocation, useNavigate } from "react-router-dom"
import { api, getToken, setToken, setUnauthorizedHandler } from "@/lib/api"

type AuthContextValue = {
  isAuthenticated: boolean
  login: (password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getToken())

  const login = useCallback(async (password: string) => {
    const { token } = await api.login(password)
    setToken(token)
    setIsAuthenticated(true)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setIsAuthenticated(false)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setIsAuthenticated(false)
      const from = window.location.pathname
      navigate("/login", { replace: true, state: { from } })
    })
    return () => setUnauthorizedHandler(null)
  }, [navigate])

  const value = useMemo(
    () => ({ isAuthenticated, login, logout }),
    [isAuthenticated, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}

export function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />
  }

  return children
}
