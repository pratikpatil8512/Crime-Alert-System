import { BrowserRouter as Router, Routes, Route, /*Navigate*/ } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Map from './pages/Map';
import AdminPanel from './pages/AdminPanel';
import Unauthorized from './pages/Unauthorized';
import Register from './pages/Register';
import ReportCrime from './pages/ReportCrime';
import VerifyEmail from './pages/VerifyEmail';
import ReportTip from './pages/ReportTip';
import TipModeration from './pages/TipModeration';
import Statistics from './pages/Statistics';
import ManageCrimes from './pages/ManageCrimes';
import MyReports from './pages/MyReports';
import EmergencyHub from './pages/EmergencyHub';
import NeedHelp from './pages/NeedHelp';
import HelpRequests from './pages/HelpRequests';
import NotFound from './pages/PageNotFound'


export default function App() {
  return (
    <Router>
      <Routes>
        {/* ✅ Homepage */}
        <Route path="/" element={<Home />} />

        {/* Login */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="//verify-email" element={<VerifyEmail />} />

        <Route
  path="/report"
  element={
    <ProtectedRoute allowedRoles={['admin', 'police']}>
      <ReportCrime />
    </ProtectedRoute>
  }
/>

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route path="/report-tip" element={<ReportTip />} />

        <Route
          path="/my-reports"
          element={
            <ProtectedRoute>
              <MyReports />
            </ProtectedRoute>
          }
        />

        <Route
          path="/emergency"
          element={
            <ProtectedRoute>
              <EmergencyHub />
            </ProtectedRoute>
          }
        />

        <Route
          path="/need-help"
          element={
            <ProtectedRoute allowedRoles={['tourist', 'citizen']}>
              <NeedHelp />
            </ProtectedRoute>
          }
        />

        <Route
          path="/help-requests"
          element={
            <ProtectedRoute allowedRoles={['admin', 'police']}>
              <HelpRequests />
            </ProtectedRoute>
          }
        />


        <Route
  path="/tip-moderation"
  element={
    <ProtectedRoute allowedRoles={['admin', 'police']}>
      <TipModeration />
    </ProtectedRoute>
  }
/>


        <Route
          path="/map"
          element={
            <ProtectedRoute>
              <Map />
            </ProtectedRoute>
          }
        />

        <Route
          path="/statistics"
          element={
            <ProtectedRoute allowedRoles={['admin', 'police']}>
              <Statistics />
            </ProtectedRoute>
          }
        />

        <Route
          path="/manage-crimes"
          element={
            <ProtectedRoute allowedRoles={['admin', 'police']}>
              <ManageCrimes />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin-panel"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminPanel />
            </ProtectedRoute>
          }
        />

        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Fallback redirect */}
        <Route path="*" element={<NotFound/>} />
      </Routes>
    </Router>
  );
}
