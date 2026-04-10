import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { isSessionUnlocked } from '../utils/sessionLock'

export default function RequirePinRoute({ children }) {
  const location = useLocation()
  const [, forceCheck] = useState(0)

  useEffect(() => {
    const triggerCheck = () => {
      forceCheck((prev) => prev + 1)
    }

    const intervalId = window.setInterval(triggerCheck, 15 * 1000)

    window.addEventListener('focus', triggerCheck)
    window.addEventListener('storage', triggerCheck)
    document.addEventListener('visibilitychange', triggerCheck)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', triggerCheck)
      window.removeEventListener('storage', triggerCheck)
      document.removeEventListener('visibilitychange', triggerCheck)
    }
  }, [])

  if (!isSessionUnlocked()) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`
    const search = new URLSearchParams({ returnTo }).toString()

    return <Navigate replace to={`/?${search}`} />
  }

  return children
}
