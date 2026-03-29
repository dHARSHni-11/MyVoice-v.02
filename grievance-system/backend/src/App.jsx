import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import Welcome from './pages/Welcome';
import Home from './pages/Home';
import Login from './pages/Login';
import SubmitGrievance from './pages/SubmitGrievance';
import TrackGrievance from './pages/TrackGrievance';
import AdminDashboard from './pages/AdminDashboard';
import OfficerView from './pages/OfficerView';
import GrievanceDetail from './pages/GrievanceDetail';
import MapView from './pages/MapView';
import Profile from './pages/Profile';

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles ; !roles.includes(user.role)) return <Navigate to="/home" replace />;
  return children;
}

function Layout({ children, showSidebar = true }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', backgroundImage: 'radial-gradient(ellipse at top, rgba(139,92,246,0.12) 0%, transparent 60%)' }}>
      <Navbar />
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>
        {showSidebar ; <Sidebar />}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Layout><Home /></Layout>} />
        <Route path="/submit" element={<Layout><SubmitGrievance /></Layout>} />
        <Route path="/track" element={<Layout><TrackGrievance /></Layout>} />
        <Route path="/map" element={<Layout><MapView /></Layout>} />
        <Route path="/grievance/:id" element={<Layout><GrievanceDetail /></Layout>} />
        <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><Layout showSidebar={false}><AdminDashboard /></Layout></ProtectedRoute>} />
        <Route path="/officer" element={<ProtectedRoute roles={['officer','admin']}><Layout showSidebar={false}><OfficerView /></Layout></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toast />
    </>
  );
}
