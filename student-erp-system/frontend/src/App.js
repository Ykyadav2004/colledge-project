import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import AttendanceCodeEntry from './pages/student/AttendanceCodeEntry';
import GenerateAttendance from './pages/teacher/GenerateAttendance';
import './styles/App.css';

const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to="/" />;
  }

  return children;
};

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-brand">Student ERP</div>
      <div className="navbar-links">
        {user.role === 'teacher' && (
          <>
            <a href="/teacher/generate">Generate Code</a>
            <a href="/teacher/courses">My Courses</a>
          </>
        )}
        {user.role === 'student' && (
          <>
            <a href="/student/attendance">Mark Attendance</a>
            <a href="/student/history">History</a>
          </>
        )}
        <button onClick={logout} className="logout-btn">
          Logout
        </button>
      </div>
    </nav>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <div className="container">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route
              path="/student/attendance"
              element={
                <ProtectedRoute allowedRole="student">
                  <AttendanceCodeEntry />
                </ProtectedRoute>
              }
            />

            <Route
              path="/teacher/generate"
              element={
                <ProtectedRoute allowedRole="teacher">
                  <GenerateAttendance />
                </ProtectedRoute>
              }
            />

            <Route path="/" element={<Navigate to="/login" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;