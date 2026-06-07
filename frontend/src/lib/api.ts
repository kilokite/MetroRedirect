const API_BASE = import.meta.env.VITE_API_URL ?? ""
const TOKEN_KEY = "url_redirect_token"

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export type Domain = {
  id: number
  hostname: string
  is_default: boolean
  is_open: boolean
  created_at: string
}

export type PublicDomain = {
  hostname: string
}

export type PublicCreateLinkResponse = {
  short_url: string
}

export type Link = {
  id: number
  domain_id: number
  slug: string
  target_url: string
  title: string | null
  enabled: boolean
  click_count: number
  created_at: string
  updated_at: string
}

export type PaginatedLinks = {
  items: Link[]
  total: number
  page: number
  limit: number
}

export type LoginResponse = {
  token: string
  expires_in: number
}

export type MemoryProbe = {
  pid: number
  rss_bytes: number
  virtual_memory_bytes: number
  rss: string
  virtual_memory: string
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

type RequestOptions = {
  method?: string
  body?: unknown
  auth?: boolean
  skipAuthRedirect?: boolean
}

type UnauthorizedHandler = () => void

let unauthorizedHandler: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (options.auth !== false) {
    const token = getToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String(data.error)
        : response.statusText

    if (
      response.status === 401 &&
      options.auth !== false &&
      !options.skipAuthRedirect
    ) {
      setToken(null)
      unauthorizedHandler?.()
    }

    throw new ApiError(response.status, message)
  }

  return data as T
}

export const api = {
  login(password: string) {
    return request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: { password },
      auth: false,
    })
  },

  changePassword(oldPassword: string, newPassword: string) {
    return request<{ message: string }>("/api/auth/password", {
      method: "PUT",
      body: { old_password: oldPassword, new_password: newPassword },
      skipAuthRedirect: true,
    })
  },

  getMemoryProbe() {
    return request<MemoryProbe>("/api/probe/memory")
  },

  listDomains() {
    return request<Domain[]>("/api/domains")
  },

  createDomain(data: { hostname: string; is_default?: boolean; is_open?: boolean }) {
    return request<Domain>("/api/domains", { method: "POST", body: data })
  },

  updateDomain(
    id: number,
    data: { hostname?: string; is_default?: boolean; is_open?: boolean },
  ) {
    return request<Domain>(`/api/domains/${id}`, { method: "PUT", body: data })
  },

  deleteDomain(id: number) {
    return request<void>(`/api/domains/${id}`, { method: "DELETE" })
  },

  listLinks(params?: {
    domain_id?: number
    q?: string
    page?: number
    limit?: number
  }) {
    const search = new URLSearchParams()
    if (params?.domain_id) search.set("domain_id", String(params.domain_id))
    if (params?.q) search.set("q", params.q)
    if (params?.page) search.set("page", String(params.page))
    if (params?.limit) search.set("limit", String(params.limit))
    const query = search.toString()
    return request<PaginatedLinks>(`/api/links${query ? `?${query}` : ""}`)
  },

  createLink(data: {
    domain_id: number
    target_url: string
    slug?: string
    title?: string
    enabled?: boolean
  }) {
    return request<Link>("/api/links", { method: "POST", body: data })
  },

  updateLink(
    id: number,
    data: {
      domain_id?: number
      target_url?: string
      slug?: string
      title?: string
      enabled?: boolean
    },
  ) {
    return request<Link>(`/api/links/${id}`, { method: "PUT", body: data })
  },

  deleteLink(id: number) {
    return request<void>(`/api/links/${id}`, { method: "DELETE" })
  },

  listOpenDomains() {
    return request<PublicDomain[]>("/api/public/domains", { auth: false })
  },

  createPublicLink(data: { hostname: string; target_url: string }) {
    return request<PublicCreateLinkResponse>("/api/public/links", {
      method: "POST",
      body: data,
      auth: false,
    })
  },
}
