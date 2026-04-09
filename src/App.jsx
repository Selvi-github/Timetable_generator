import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import Header from './components/Header';
import PageTransition from './components/PageTransition';
import Login from './pages/Login';
import Home from './pages/Home'; // New
import Dashboard from './pages/Dashboard'; // This is now the "Generator"
import StaffProfiles from './pages/StaffProfiles';
import TimetableView from './pages/TimetableView';
import Subjects from './pages/Subjects';
import Downloads from './pages/Downloads';
import DashboardLayout from './components/layout/DashboardLayout';
import { UserProvider, useUser } from './context/UserContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useUser();
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public Route */}
        <Route path="/" element={<PageTransition><Login /></PageTransition>} />

        {/* Authenticated Routes wrapped in DashboardLayout and ProtectedRoute */}
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="/home" element={<PageTransition><Home /></PageTransition>} />
          <Route path="/generator" element={<PageTransition><Dashboard /></PageTransition>} />
          <Route path="/staff" element={<PageTransition><StaffProfiles /></PageTransition>} />
          <Route path="/timetable" element={<PageTransition><TimetableView /></PageTransition>} />
          <Route path="/subjects" element={<PageTransition><Subjects /></PageTransition>} />
          <Route path="/downloads" element={<PageTransition><Downloads /></PageTransition>} />
        </Route>

        {/* Redirects */}
        <Route path="/dashboard" element={<Navigate to="/home" replace />} />
        <Route path="/generate" element={<Navigate to="/generator" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <Router>
      <UserProvider>
        <AnimatedRoutes />
      </UserProvider>
    </Router>
  );
}

export default App;
