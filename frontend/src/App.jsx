import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SidebarProvider, useSidebar } from './context/SidebarContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedRoute, RoleRoute, ROLE_DASHBOARDS_MAP } from './routes/ProtectedRoute';

// Layout
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import EmployeeLayout from './components/EmployeeLayout';

// Pages
import Login from './pages/auth/Login';
import Profile from './pages/common/Profile';

// Employee
import MyAssets from './pages/employee/MyAssets';
import ExitStatus from './pages/employee/ExitStatus';
import EmployeeIssues from './pages/employee/EmployeeIssues';

// Store Manager
import Inventory from './pages/store_manager/Inventory';
import AddAsset from './pages/store_manager/AddAsset';
import Returns from './pages/store_manager/Returns';
import StoreAssetRequests from './pages/store_manager/AssetRequests';
import AssignmentHistory from './pages/store_manager/AssignmentHistory';
import PurchaseManagement from './pages/store_manager/PurchaseManagement';
import Maintenance from './pages/store_manager/Maintenance';
import Issues from './pages/store_manager/Issues';

// Manager
import Dashboard from './pages/manager/Dashboard';
import Employees from './pages/manager/Employees';
import Allocations from './pages/manager/Allocations';
import ExitClearance from './pages/manager/ExitClearance';
import ManagerAssetRequests from './pages/manager/AssetRequests';

// Director
import Reports from './pages/director/Reports';
import AuditLogs from './pages/director/AuditLogs';
import Roles from './pages/director/Roles';
import ExitApprovals from './pages/director/ExitApprovals';

const ProtectedLayout = () => {
  const { isCollapsed } = useSidebar();

  return (
    <div className={`app-layout ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar />
      <div className="main-wrapper">
        <TopBar />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SidebarProvider>
        <NotificationProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#ffffff',
                color: '#0f172a',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
                fontSize: '0.875rem',
                fontFamily: 'Outfit, sans-serif',
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Employee Routes with Custom Mobile Layout */}
            <Route element={<ProtectedRoute><RoleRoute roles={['employee']}><EmployeeLayout /></RoleRoute></ProtectedRoute>}>
              <Route path="/employee/assets" element={<MyAssets />} />
              <Route path="/employee/issues" element={<EmployeeIssues />} />
              <Route path="/employee/exit-status" element={<ExitStatus />} />
            </Route>

            {/* Standard Protected Routes with Desktop Sidebar Layout */}
            <Route element={<ProtectedRoute><ProtectedLayout /></ProtectedRoute>}>

              {/* Default Redirect based on role (handled inside RoleRoute conditionally) */}
              <Route path="/" element={<Navigate to="/login" replace />} />

              {/* Universal Common Routes */}
              <Route path="/profile" element={<Profile />} />



              {/* Store Manager Routes */}
              <Route path="/store-manager">
                <Route path="inventory" element={<RoleRoute roles={['store_manager']}><Inventory /></RoleRoute>} />
                <Route path="add-asset" element={<RoleRoute roles={['store_manager']}><AddAsset /></RoleRoute>} />
                <Route path="returns" element={<RoleRoute roles={['store_manager']}><Returns /></RoleRoute>} />
                <Route path="asset-requests" element={<RoleRoute roles={['store_manager']}><StoreAssetRequests /></RoleRoute>} />
                <Route path="assignment-history" element={<RoleRoute roles={['store_manager']}><AssignmentHistory /></RoleRoute>} />
                <Route path="purchases" element={<RoleRoute roles={['store_manager']}><PurchaseManagement /></RoleRoute>} />
                <Route path="maintenance" element={<RoleRoute roles={['store_manager']}><Maintenance /></RoleRoute>} />
                <Route path="issues" element={<RoleRoute roles={['store_manager']}><Issues /></RoleRoute>} />
              </Route>

              {/* Manager Routes */}
              <Route path="/manager">
                <Route path="dashboard" element={<RoleRoute roles={['manager']}><Dashboard /></RoleRoute>} />
                <Route path="employees" element={<RoleRoute roles={['manager']}><Employees /></RoleRoute>} />
                <Route path="allocations" element={<RoleRoute roles={['manager']}><Allocations /></RoleRoute>} />
                <Route path="exit-clearance" element={<RoleRoute roles={['manager']}><ExitClearance /></RoleRoute>} />
                <Route path="asset-requests" element={<RoleRoute roles={['manager']}><ManagerAssetRequests /></RoleRoute>} />
              </Route>

              {/* Director Routes */}
              <Route path="/director">
                <Route path="reports" element={<RoleRoute roles={['director']}><Reports /></RoleRoute>} />
                <Route path="audit-logs" element={<RoleRoute roles={['director']}><AuditLogs /></RoleRoute>} />
                <Route path="roles" element={<RoleRoute roles={['director']}><Roles /></RoleRoute>} />
                <Route path="exit-approvals" element={<RoleRoute roles={['director']}><ExitApprovals /></RoleRoute>} />
              </Route>

            </Route>

            {/* 404 Catch all */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </NotificationProvider>
      </SidebarProvider>
    </AuthProvider>
  );
}
