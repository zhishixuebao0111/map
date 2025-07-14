import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import MapPage from './pages/MapPage';
import React from 'react';
import RegisterPage from './pages/RegisterPage';
function App() {
  return (
    <Router>
    <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/register" element={<RegisterPage />} />
          {/* 其他页面路由 */}
          <Route path="/" element={<Navigate to="/map" replace />} />
          <Route path="*" element={<Navigate to="/map" />} />
        </Routes>
    </AuthProvider>
    </Router>
  );
}

export default App;