import { Navigate, Route, Routes } from 'react-router-dom'
import AllServicesPage from './pages/AllServicesPage'
import RequirePinRoute from './components/RequirePinRoute'
import HomePage from './pages/HomePage'
import IncomePage from './pages/IncomePage'
import MobileEntryPage from './pages/MobileEntryPage'
import CostPage from './pages/CostPage'
import MonitoringPage from './pages/MonitoringPage'
import NotificationsPage from './pages/NotificationsPage'
import PayPage from './pages/PayPage'
import PreviewPage from './pages/PreviewPage'
import TransferPage from './pages/TransferPage'

function App() {
  return (
    <div className="min-h-screen bg-[#041329]">
      <Routes>
        <Route path="/" element={<MobileEntryPage />} />
        <Route path="/preview" element={<PreviewPage />} />
        <Route
          path="/home"
          element={
            <RequirePinRoute>
              <HomePage />
            </RequirePinRoute>
          }
        />
        <Route
          path="/transfers"
          element={
            <RequirePinRoute>
              <TransferPage />
            </RequirePinRoute>
          }
        />
        <Route
          path="/pay"
          element={
            <RequirePinRoute>
              <PayPage />
            </RequirePinRoute>
          }
        />
        <Route
          path="/monitoring"
          element={
            <RequirePinRoute>
              <MonitoringPage />
            </RequirePinRoute>
          }
        />
        <Route
          path="/cost"
          element={
            <RequirePinRoute>
              <CostPage />
            </RequirePinRoute>
          }
        />
        <Route
          path="/income"
          element={
            <RequirePinRoute>
              <IncomePage />
            </RequirePinRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <RequirePinRoute>
              <NotificationsPage />
            </RequirePinRoute>
          }
        />
        <Route
          path="/services"
          element={
            <RequirePinRoute>
              <AllServicesPage />
            </RequirePinRoute>
          }
        />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </div>
  )
}

export default App
