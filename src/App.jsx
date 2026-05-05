import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import AppPage from './pages/AppPage';
import ApiDocsPage from './pages/ApiDocsPage';
import StaticPages from './pages/StaticPages';
import PricingPage from './pages/PricingPage';
import AdminPage from './pages/AdminPage';
import ToolsPage from './pages/ToolsPage';
import HostingPage from './pages/HostingPage';

function App() {
  return (
    <ToastProvider>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/app" element={<AppPage />} />
        <Route path="/api-docs" element={<ApiDocsPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/hosting" element={<HostingPage />} />
        <Route path="/terms" element={<StaticPages type="terms" />} />
        <Route path="/legal" element={<StaticPages type="legal" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </ToastProvider>
  );
}

export default App;
