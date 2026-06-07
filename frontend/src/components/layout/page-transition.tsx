import { Outlet, useLocation } from "react-router-dom"

export function PageTransition() {
  const location = useLocation()

  return (
    <div
      key={location.pathname}
      className="w-full min-w-0 animate-in fade-in slide-in-from-bottom-1 duration-200 fill-mode-both"
    >
      <Outlet />
    </div>
  )
}
