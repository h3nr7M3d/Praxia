import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import RegisterCompany from './pages/RegisterCompany'
import RegisterCustomer from './pages/RegisterCustomer'
import RegisterStep3 from './pages/RegisterStep3'
import CustomerDashboard from './pages/CustomerDashboard'
import CompanyDashboard from './pages/CompanyDashboard'
import CompanyBuses from './pages/CompanyBuses'
import CompanyTrips from './pages/CompanyTrips'
import CompanyStats from './pages/CompanyStats'
import CompanyRoutes from './pages/CompanyRoutes'
import CompanySales from './pages/CompanySales'
import AdminDashboard from './pages/AdminDashboard'
import AdminUsers from './pages/AdminUsers'
import AdminEmployees from './pages/AdminEmployees'
import AdminBranches from './pages/AdminBranches'
import AdminStats from './pages/AdminStats'
import MyTickets from './pages/MyTickets'
import BuyTickets from './pages/BuyTickets'
import MyTransactions from './pages/MyTransactions'
import MyCards from './pages/MyCards'
import MyAccountV2 from './pages/MyAccountV2'
import Cart from './pages/Cart'
import PaymentSelect from './pages/PaymentSelect'
import PaymentCards from './pages/PaymentCards'
import ChatButton from './components/ChatButton'
import PraxiaHome from './pages/PraxiaHome'
import AuthRoute from './components/AuthRoute'
import AdminRoute from './components/AdminRoute'
import SelectTipo from './pages/citas/SelectTipo'
import SelectPaciente from './pages/citas/SelectPaciente'
import ModoBusqueda from './pages/citas/ModoBusqueda'
import SelectEspecialidad from './pages/citas/SelectEspecialidad'
import SelectCentro from './pages/citas/SelectCentro'
import SelectMedico from './pages/citas/SelectMedico'
import SelectHorario from './pages/citas/SelectHorario'
import ConfirmarCita from './pages/citas/ConfirmarCita'
import PagarCita from './pages/citas/PagarCita'
import MyAppointments from './pages/MyAppointments'
import MedicoPortal from './pages/medico/PortalStable'
import MedicoRoute from './components/MedicoRoute'

export default function App() {
  const location = useLocation()
  const path = location.pathname
  const isAuthRoute = path === '/login' || path.startsWith('/register')

  return (
    <>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register/empresa" element={<RegisterCompany />} />
        <Route path="/register/cliente" element={<RegisterCustomer />} />
        <Route path="/register/paso-3" element={<RegisterStep3 />} />
        <Route path="/home" element={<PraxiaHome />} />
        
        {/* Rutas protegidas */}
        <Route element={<AuthRoute />}>
          <Route path="/dashboard/cliente" element={<CustomerDashboard />} />
          <Route path="/dashboard/paciente" element={<Navigate to="/home" replace />} />
          <Route path="/dashboard/empresa" element={<CompanyDashboard />} />
          <Route path="/dashboard/empresa/buses" element={<CompanyBuses />} />
          <Route path="/dashboard/empresa/viajes" element={<CompanyTrips />} />
          <Route path="/dashboard/empresa/rutas" element={<CompanyRoutes />} />
          <Route path="/dashboard/empresa/ventas" element={<CompanySales />} />
          <Route path="/dashboard/empresa/estadisticas" element={<CompanyStats />} />
          <Route element={<AdminRoute />}>
            <Route path="/dashboard/admin" element={<AdminDashboard />} />
            <Route path="/dashboard/admin/usuarios" element={<AdminUsers />} />
            <Route path="/dashboard/admin/empleados" element={<AdminEmployees />} />
            <Route path="/dashboard/admin/sucursales" element={<AdminBranches />} />
            <Route path="/dashboard/admin/estadisticas" element={<AdminStats />} />
          </Route>
          <Route path="/dashboard/cliente/pasajes" element={<MyTickets />} />
          <Route path="/dashboard/cliente/comprar" element={<BuyTickets />} />
          <Route path="/dashboard/cliente/carrito" element={<Cart />} />
          <Route path="/dashboard/cliente/pago" element={<PaymentSelect />} />
          <Route path="/dashboard/cliente/pago/tarjetas/:brand" element={<PaymentCards />} />
          <Route path="/dashboard/cliente/movimientos" element={<MyTransactions />} />
          <Route path="/dashboard/cliente/tarjetas" element={<MyCards />} />
          <Route path="/micuenta" element={<MyAccountV2 />} />
          {/* Flujo de citas */}
          <Route path="/citas" element={<SelectTipo />} />
          <Route path="/citas/paciente" element={<SelectPaciente />} />
          <Route path="/citas/agendar" element={<ModoBusqueda />} />
          <Route path="/citas/especialidad" element={<SelectEspecialidad />} />
          <Route path="/citas/centro" element={<SelectCentro />} />
          <Route path="/citas/medico" element={<SelectMedico />} />
          <Route path="/citas/horario" element={<SelectHorario />} />
          <Route path="/citas/confirmar" element={<ConfirmarCita />} />
          <Route path="/citas/pago" element={<PagarCita />} />
          <Route path="/citas/mis-citas" element={<MyAppointments />} />
          {/* Portal Médico (demo navegable) – solo para rol 'medico' */}
          <Route element={<MedicoRoute />}>
            <Route path="/medico" element={<MedicoPortal />} />
          </Route>
          {/* Compat: enviar /citas/programar al primer paso */}
          <Route path="/citas/programar" element={<Navigate to="/citas" replace />} />
        </Route>
        
        {/* Rutas por defecto */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      {!isAuthRoute && <ChatButton />}
    </>
  )
}
