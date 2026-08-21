import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PublicLayout from "./layouts/PublicLayout";
import AppLayout from "./layouts/AppLayout";
import { getInitialTheme, applyTheme } from "./lib/theme";
import Landing from "./pages/Landing";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";

import ForgotPassword from "./pages/Auth/ForgotPassword";
import ResetPassword from "./pages/Auth/ResetPassword";

import DashboardPage from "./pages/Dashboard";
import LeadsPage from "./pages/Leads";
import PropiedadesPage from "./pages/Propiedades";
import UsuariosPage from "./pages/Usuarios";
import ConfiguracionPage from "./pages/Configuracion";
import AvisosPage from "./pages/Avisos";
import MetricasPage from "./pages/Metricas";





export default function App() {
  useEffect(() => {
    applyTheme(getInitialTheme());
  }, []);
  return (
    <>
      <Routes>
        {/* Público */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<Landing />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
        </Route>

        {/* App autenticada */}
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="propiedades" element={<PropiedadesPage />} />
          <Route path="usuarios" element={<UsuariosPage />} />
          <Route path="avisos" element={<AvisosPage />} />
          <Route path="configuracion" element={<ConfiguracionPage />} />
          <Route path="metricas" element={<MetricasPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      
    </>
  );
}
