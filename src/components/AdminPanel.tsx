import React, { useState } from 'react';
import { 
  PatientRecord, 
  User, 
  InventoryItem, 
  DischargeRequest 
} from '../types/hospital';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Search, 
  Boxes,
  Clock,
  BedDouble,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  Trash2,
  AlertTriangle,
  FileCheck,
  Eye,
  EyeOff,
  Copy,
  Check,
  KeyRound,
  ShieldAlert,
  ArrowLeft,
  Lock
} from 'lucide-react';

interface AdminPanelProps {
  patients: PatientRecord[];
  users: User[];
  inventory: InventoryItem[];
  dischargeRequests: DischargeRequest[];
  onApproveDischarge: (requestId: number, notes?: string) => void;
  onRejectDischarge: (requestId: number, reason: string) => void;
  onRestockInventory: (inventoryId: number, amount: number) => void;
  onAddUser: (user: Partial<User>, doctorData?: any, patientData?: any) => void;
  onDeleteUser: (userId: number) => void;
  onSelectPatientByBed?: (patientId: number) => void;
  activeSubTab?: string;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  patients,
  users,
  inventory,
  dischargeRequests,
  onApproveDischarge,
  onRejectDischarge,
  onRestockInventory,
  onAddUser,
  onDeleteUser,
  onSelectPatientByBed,
  activeSubTab = 'dashboard'
}) => {
  // SubTab activo: únicamente 'dashboard' o 'egresos' en la navegación
  const [subTab, setSubTab] = useState<'dashboard' | 'egresos'>(
    activeSubTab === 'egresos' ? 'egresos' : 'dashboard'
  );

  // Vistas auxiliares integradas dentro del Dashboard para no saturar el menú
  const [dashboardOverlayView, setDashboardOverlayView] = useState<'none' | 'usuarios' | 'farmacia'>('none');

  // Tarjeta interactiva desplegada en el Dashboard
  const [expandedKpi, setExpandedKpi] = useState<'pacientes' | 'medicos' | 'egresos' | 'farmacia' | null>('pacientes');

  // Reabastecimiento de medicamentos
  const [restockAmounts, setRestockAmounts] = useState<Record<number, number>>({});
  const [restockSuccessId, setRestockSuccessId] = useState<number | null>(null);

  // Gestión de usuarios y visualización de contraseñas
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserRole, setNewUserRole] = useState<1 | 2 | 3>(1);

  // Control de visualización de contraseñas para auditoría
  const [showAllPasswords, setShowAllPasswords] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<number, boolean>>({});
  const [copiedUserId, setCopiedUserId] = useState<number | null>(null);

  // Campos para nuevo usuario
  const [newNombre, setNewNombre] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('Hospital2026!');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newRut, setNewRut] = useState('');
  const [newTelefono, setNewTelefono] = useState('');
  const [newCargo, setNewCargo] = useState('Subdirección Administrativa');
  const [newEspecialidad, setNewEspecialidad] = useState('');
  const [newColegiado, setNewColegiado] = useState('');
  const [newCama, setNewCama] = useState('Cama 05-A');
  const [newDiagnostico, setNewDiagnostico] = useState('');

  // Notas de observación para egresos
  const [rejectNotes, setRejectNotes] = useState<Record<number, string>>({});

  React.useEffect(() => {
    if (activeSubTab === 'egresos') {
      setSubTab('egresos');
      setDashboardOverlayView('none');
    } else {
      setSubTab('dashboard');
    }
  }, [activeSubTab]);

  // Contadores
  const activePatients = patients.filter(p => p.estado_automata !== 'q5');
  const activeDoctors = users.filter(u => u.rol_id === 2 && u.activo);
  const pendingEgresos = dischargeRequests.filter(r => r.estado === 'PENDIENTE');
  const resolvedEgresos = dischargeRequests.filter(r => r.estado !== 'PENDIENTE');
  const alertMedications = inventory.filter(i => i.stock_actual <= i.medicamento.stock_minimo);

  // Filtro de usuarios
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.nombre_completo.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.rut_dni.includes(userSearch);
    if (userRoleFilter === 'all') return matchesSearch;
    return matchesSearch && u.rol_id === Number(userRoleFilter);
  });

  const togglePasswordVisibility = (userId: number) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleCopyPassword = (userId: number, passwordText: string) => {
    navigator.clipboard.writeText(passwordText);
    setCopiedUserId(userId);
    setTimeout(() => setCopiedUserId(null), 2000);
  };

  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre.trim() || !newEmail.trim() || !newRut.trim()) return;

    const baseUserData: Partial<User> = {
      nombre_completo: newNombre,
      email: newEmail,
      password: newPassword || 'Hospital2026!',
      rut_dni: newRut,
      telefono: newTelefono || '+56 9 8000 0000',
      activo: true,
      rol_id: newUserRole
    };

    if (newUserRole === 1) {
      onAddUser({
        ...baseUserData,
        cargo: newCargo || 'Gestión Asistencial'
      });
    } else if (newUserRole === 2) {
      onAddUser(
        {
          ...baseUserData,
          especialidad: newEspecialidad || 'Urgencias Generales',
          numero_colegiado: newColegiado || `COLMED-${Math.floor(10000 + Math.random() * 90000)}`
        },
        { especialidad: newEspecialidad, colegiado: newColegiado }
      );
    } else {
      onAddUser(
        baseUserData,
        undefined,
        {
          numero_cama: newCama,
          diagnostico_ingreso: newDiagnostico || 'Observación en sala post-urgencias',
          grupo_sanguineo: 'O+',
          alergias: 'Ninguna conocida',
          medico_asignado_id: 2
        }
      );
    }

    setShowAddUserModal(false);
    setNewNombre('');
    setNewEmail('');
    setNewPassword('Hospital2026!');
    setNewRut('');
    setNewTelefono('');
    setNewEspecialidad('');
    setNewColegiado('');
    setNewDiagnostico('');
  };

  const handleRestockSingle = (itemId: number) => {
    const amount = Number(restockAmounts[itemId] || 25);
    if (amount > 0) {
      onRestockInventory(itemId, amount);
      setRestockAmounts({ ...restockAmounts, [itemId]: 20 });
      setRestockSuccessId(itemId);
      setTimeout(() => setRestockSuccessId(null), 2500);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Sub-navegación limpia para Administrador: Únicamente Dashboard y Autorización de Egresos */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSubTab('dashboard');
              setDashboardOverlayView('none');
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              subTab === 'dashboard' && dashboardOverlayView === 'none'
                ? 'bg-teal-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Dashboard
          </button>

          {/* Sección con título limpio: AUTORIZACIÓN DE EGRESOS (sin la palabra 'Altas') */}
          <button
            onClick={() => {
              setSubTab('egresos');
              setDashboardOverlayView('none');
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer relative ${
              subTab === 'egresos'
                ? 'bg-teal-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Autorización de Egresos
            {pendingEgresos.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-bold">
                {pendingEgresos.length}
              </span>
            )}
          </button>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Dra. Elena Ramos (Dirección Médica & Administrativa)
        </span>
      </div>

      {/* VISTA 1: DASHBOARD CON TARJETAS INTERACTIVAS */}
      {subTab === 'dashboard' && dashboardOverlayView === 'none' && (
        <div className="space-y-6">
          
          {/* CUADRÍCULA DE 4 TARJETAS INTERACTIVAS (CLICKABLES PARA DESPLEGAR DETALLE) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Tarjeta 1: Pacientes en Post-Urgencias */}
            <div
              onClick={() => setExpandedKpi(expandedKpi === 'pacientes' ? null : 'pacientes')}
              className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${
                expandedKpi === 'pacientes'
                  ? 'bg-teal-50/50 border-teal-600 ring-2 ring-teal-600/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-teal-400 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Pacientes Post-Urgencias</span>
                {expandedKpi === 'pacientes' ? <ChevronUp className="w-4 h-4 text-teal-800" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {activePatients.length}
                </span>
                <span className="text-xs text-slate-500">8 Camas Habilitadas</span>
              </div>
              <p className="mt-2 text-[11px] text-teal-800 font-medium">
                Clic para ver camas y acceso a personal
              </p>
            </div>

            {/* Tarjeta 2: Médicos en Guardia */}
            <div
              onClick={() => setExpandedKpi(expandedKpi === 'medicos' ? null : 'medicos')}
              className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${
                expandedKpi === 'medicos'
                  ? 'bg-teal-50/50 border-teal-600 ring-2 ring-teal-600/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-teal-400 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Médicos en Guardia</span>
                {expandedKpi === 'medicos' ? <ChevronUp className="w-4 h-4 text-teal-800" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {activeDoctors.length}
                </span>
                <span className="text-xs text-emerald-700 font-medium">Turno Activo</span>
              </div>
              <p className="mt-2 text-[11px] text-teal-800 font-medium">
                Clic para ver especialistas y turnos
              </p>
            </div>

            {/* Tarjeta 3: Egresos Médicos por Autorizar */}
            <div
              onClick={() => setExpandedKpi(expandedKpi === 'egresos' ? null : 'egresos')}
              className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${
                expandedKpi === 'egresos'
                  ? 'bg-amber-50/60 border-amber-500 ring-2 ring-amber-400/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-amber-400 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Egresos por Autorizar</span>
                {expandedKpi === 'egresos' ? <ChevronUp className="w-4 h-4 text-amber-800" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-amber-600">
                  {pendingEgresos.length}
                </span>
                <span className="text-xs text-amber-700 font-medium">Emitidas por Médico</span>
              </div>
              <p className="mt-2 text-[11px] text-amber-800 font-medium">
                Clic para autorizar salida administrativa
              </p>
            </div>

            {/* Tarjeta 4: Medicamentos en Alerta / Farmacia */}
            <div
              onClick={() => setExpandedKpi(expandedKpi === 'farmacia' ? null : 'farmacia')}
              className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${
                expandedKpi === 'farmacia'
                  ? 'bg-red-50/50 border-red-500 ring-2 ring-red-400/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-red-400 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Farmacia en Alerta</span>
                {expandedKpi === 'farmacia' ? <ChevronUp className="w-4 h-4 text-red-800" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-red-600">
                  {alertMedications.length}
                </span>
                <span className="text-xs text-red-600 font-medium">Stock Crítico</span>
              </div>
              <p className="mt-2 text-[11px] text-red-800 font-medium">
                Clic para reabastecer inventario
              </p>
            </div>

          </div>

          {/* DESGLOSE DETALLADO SEGÚN LA TARJETA SELECCIONADA */}
          {expandedKpi && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs transition-all">
              
              {/* Desglose 1: Pacientes en Post-Urgencias */}
              {expandedKpi === 'pacientes' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <BedDouble className="w-4 h-4 text-teal-800" />
                        Desglose: Pacientes en Sala Post-Urgencias
                      </h4>
                      <p className="text-xs text-slate-500">Monitoreo activo de camas y pacientes internados.</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDashboardOverlayView('usuarios')}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 border border-slate-200"
                        title="Abrir directorio completo con visualizador de contraseñas para auditoría"
                      >
                        <Users className="w-3.5 h-3.5 text-teal-800" />
                        <span>Directorio y Gestión de Usuarios</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    {patients.map(p => (
                      <div
                        key={p.id}
                        onClick={() => onSelectPatientByBed && onSelectPatientByBed(p.id)}
                        className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 hover:border-teal-500 hover:bg-white transition-all cursor-pointer space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {p.numero_cama}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-900">
                            [{p.estado_automata}]
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-slate-900">{p.nombre_completo}</h5>
                        <p className="text-[11px] text-slate-600 line-clamp-2">{p.diagnostico_ingreso}</p>
                        <div className="pt-1.5 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between">
                          <span>Médico: {p.medico_asignado_nombre}</span>
                          <span className="font-mono">{p.signos_actuales ? `SpO2: ${p.signos_actuales.saturacion_oxigeno}%` : 'Normal'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Desglose 2: Médicos en Guardia */}
              {expandedKpi === 'medicos' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-teal-800" />
                      Desglose: Equipo Médico de Guardia
                    </h4>
                    <span className="text-xs text-slate-500">{activeDoctors.length} médicos activos</span>
                  </div>

                  <div className="divide-y divide-slate-100 text-xs">
                    {activeDoctors.map(doc => (
                      <div key={doc.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <strong className="text-slate-900 block">{doc.nombre_completo}</strong>
                          <span className="text-slate-500 text-[11px]">{doc.especialidad} · <code>{doc.numero_colegiado}</code></span>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            En Guardia Activa
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono mt-0.5">{doc.telefono}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Desglose 3: Historial y Gestión de Egresos Médicos */}
              {expandedKpi === 'egresos' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-amber-700" />
                      Desglose: Egresos Emitidos por Médicos para Autorización
                    </h4>
                    <button
                      onClick={() => setSubTab('egresos')}
                      className="text-xs text-teal-800 hover:text-teal-950 font-semibold cursor-pointer underline"
                    >
                      Ir a Gestión de Egresos Completa →
                    </button>
                  </div>

                  {pendingEgresos.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-500">
                      No hay órdenes de egreso pendientes de autorización administrativa en este momento.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingEgresos.map(sol => (
                        <div key={sol.id} className="p-3 bg-amber-50/40 border border-amber-200 rounded-lg space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                                {sol.numero_cama}
                              </span>
                              <strong>{sol.paciente_nombre}</strong>
                              <span className="text-slate-500">· Emitida por: {sol.medico_solicitante_nombre}</span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">{sol.fecha_solicitud}</span>
                          </div>

                          <p className="text-slate-700 text-xs bg-white p-2 rounded border border-amber-100">
                            {sol.resumen_clinico}
                          </p>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-slate-500 italic">
                              Médico certificó estabilidad y dosis completas.
                            </span>

                            <div className="flex gap-2">
                              <button
                                onClick={() => onRejectDischarge(sol.id, 'Requiere mayor tiempo de observación')}
                                className="px-2.5 py-1 text-xs text-red-700 bg-white hover:bg-red-50 border border-red-200 rounded-md cursor-pointer"
                              >
                                Observar Salida
                              </button>
                              <button
                                onClick={() => onApproveDischarge(sol.id)}
                                className="px-3 py-1 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md cursor-pointer shadow-xs"
                              >
                                Autorizar Salida
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Desglose 4: Medicamentos en Alerta / Farmacia */}
              {expandedKpi === 'farmacia' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-red-700" />
                      Desglose: Farmacia e Inventario Clínico
                    </h4>
                    <button
                      onClick={() => setDashboardOverlayView('farmacia')}
                      className="text-xs text-teal-800 hover:text-teal-950 font-semibold cursor-pointer underline"
                    >
                      Ver Catálogo Completo de Farmacia →
                    </button>
                  </div>

                  <div className="space-y-2">
                    {inventory.map(item => (
                      <div key={item.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <strong className="text-slate-900">{item.medicamento.nombre_comercial}</strong>
                          <span className="text-slate-500 text-[11px] block">{item.medicamento.principio_activo} · Lote: <code>{item.lote}</code></span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`font-mono font-bold ${
                            item.stock_actual <= 0 ? 'text-red-600' : item.stock_actual <= item.medicamento.stock_minimo ? 'text-amber-600' : 'text-emerald-700'
                          }`}>
                            {item.stock_actual} unid.
                          </span>

                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="1"
                              value={restockAmounts[item.id] || 25}
                              onChange={(e) => setRestockAmounts({ ...restockAmounts, [item.id]: Math.max(1, Number(e.target.value)) })}
                              className="w-16 px-2 py-1 border border-slate-300 rounded text-center font-mono text-xs bg-white"
                              title="Ingresar cualquier cantidad positiva a reabastecer"
                            />
                            <button
                              onClick={() => handleRestockSingle(item.id)}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded transition-colors cursor-pointer"
                            >
                              Reabastecer
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Mapa Visual de Camas en Post-Urgencias */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <BedDouble className="w-4 h-4 text-teal-800" />
                Estado y Distribución de Camas
              </h3>
              <span className="text-xs text-slate-500">
                Haga clic en cualquier cama para evaluar el caso clínico
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {patients.map(p => (
                <div
                  key={p.id}
                  onClick={() => onSelectPatientByBed && onSelectPatientByBed(p.id)}
                  className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:border-teal-500 hover:shadow-xs transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {p.numero_cama}
                    </span>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                      [{p.estado_automata}]
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 truncate">{p.nombre_completo}</h4>
                  <p className="text-[11px] text-slate-600 line-clamp-1">{p.diagnostico_ingreso}</p>
                  <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between">
                    <span>Médico: {p.medico_asignado_nombre}</span>
                    <span className="font-mono">{p.signos_actuales ? `SpO2 ${p.signos_actuales.saturacion_oxigeno}%` : 'Normal'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* VISTA 2: AUTORIZACIÓN DE EGRESOS (Módulo renombrado sin la palabra 'Altas') */}
      {subTab === 'egresos' && dashboardOverlayView === 'none' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-teal-800" />
                  Autorización de Egresos Médicos
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  El Médico tratante emite el dictamen clínico; el Administrador confirma los registros y autoriza formalmente la salida del paciente.
                </p>
              </div>
              <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-1 rounded">
                {pendingEgresos.length} en espera
              </span>
            </div>

            {pendingEgresos.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-lg border border-slate-100">
                <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-slate-900">No hay órdenes de egreso pendientes de autorización</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Las órdenes emitidas por el médico tratante aparecerán en esta cola para su resolución formal.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingEgresos.map(req => (
                  <div key={req.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-xs font-mono font-bold bg-teal-100 text-teal-800 rounded">
                          {req.numero_cama}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">{req.paciente_nombre}</h4>
                        <span className="text-xs text-slate-500">· Emitida por: {req.medico_solicitante_nombre}</span>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">{req.fecha_solicitud}</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                      <strong className="text-slate-800 block mb-1">Dictamen del Médico Tratante:</strong>
                      <p className="text-slate-600">{req.resumen_clinico}</p>
                    </div>

                    {req.criterios_cumplidos && (
                      <div className="text-xs space-y-1">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Criterios Clínicos Cumplidos:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {req.criterios_cumplidos.map((c, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-slate-700 bg-emerald-50/60 border border-emerald-100 px-2 py-1 rounded text-[11px]">
                              <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>{c}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                      <input
                        type="text"
                        placeholder="Observaciones administrativas (opcional)..."
                        value={rejectNotes[req.id] || ''}
                        onChange={(e) => setRejectNotes({ ...rejectNotes, [req.id]: e.target.value })}
                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 flex-1 min-w-[200px]"
                      />

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onRejectDischarge(req.id, rejectNotes[req.id] || 'Observación administrativa de egreso')}
                          className="px-3 py-1.5 text-xs text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg cursor-pointer font-medium"
                        >
                          Observar Salida
                        </button>
                        <button
                          onClick={() => onApproveDischarge(req.id, rejectNotes[req.id])}
                          className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer shadow-xs"
                        >
                          Autorizar Salida Administrativa
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historial de Egresos Resueltos */}
          {resolvedEgresos.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Historial de Egresos Resueltos
              </h4>
              <div className="divide-y divide-slate-100 text-xs">
                {resolvedEgresos.map(sol => (
                  <div key={sol.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <strong className="text-slate-900">{sol.paciente_nombre}</strong>
                      <span className="text-slate-500 ml-2">({sol.numero_cama})</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">{sol.resumen_clinico}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        sol.estado === 'APROBADA'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {sol.estado === 'APROBADA' ? 'EGRESO AUTORIZADO' : 'OBSERVADO'}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono mt-0.5">{sol.fecha_resolucion || sol.fecha_solicitud}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VISTA OVERLAY: GESTIÓN DE USUARIOS (Con Visualización y Auditoría de Contraseñas) */}
      {dashboardOverlayView === 'usuarios' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDashboardOverlayView('none')}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  title="Volver al Dashboard"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-teal-800" />
                  Gestión y Auditoría de Usuarios
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 ml-6">
                Directorio institucional con visualización de contraseñas para pruebas rápidas y auditoría del sistema.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Botón Global para Mostrar/Ocultar Todas las Contraseñas */}
              <button
                type="button"
                onClick={() => setShowAllPasswords(!showAllPasswords)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 border ${
                  showAllPasswords
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                }`}
                title="Alternar visibilidad de todas las contraseñas para pruebas de auditoría"
              >
                {showAllPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showAllPasswords ? 'Ocultar Contraseñas' : 'Mostrar Contraseñas'}</span>
              </button>

              <button
                onClick={() => setShowAddUserModal(true)}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Registrar Usuario
              </button>
            </div>
          </div>

          {/* Filtros de Búsqueda */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o RUT..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-700"
              />
            </div>

            <select
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
            >
              <option value="all">Todos los Roles</option>
              <option value="1">Administradores (rol_id 1)</option>
              <option value="2">Médicos (rol_id 2)</option>
              <option value="3">Pacientes (rol_id 3)</option>
            </select>
          </div>

          {/* TABLA CON COLUMNA DE CONTRASEÑAS Y BOTÓN DE VISUALIZACIÓN / COPIADO */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-medium">
                  <th className="py-2.5 px-3">Nombre</th>
                  <th className="py-2.5 px-3">Rol</th>
                  <th className="py-2.5 px-3">RUT / Identificación</th>
                  <th className="py-2.5 px-3">Email Institucional</th>
                  <th className="py-2.5 px-3 bg-slate-50/80 text-slate-700">Contraseña de Acceso</th>
                  <th className="py-2.5 px-3">Cargo / Especialidad</th>
                  <th className="py-2.5 px-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(u => {
                  const isVisible = showAllPasswords || !!visiblePasswords[u.id];
                  const passwordText = u.password || (u.rol_id === 1 ? 'Admin123!' : u.rol_id === 2 ? 'Medico123!' : 'Paciente123!');
                  const isCopied = copiedUserId === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3 font-semibold text-slate-900">{u.nombre_completo}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          u.rol_id === 1 ? 'bg-purple-100 text-purple-800' : u.rol_id === 2 ? 'bg-teal-100 text-teal-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {u.rol_id === 1 ? 'Administrador' : u.rol_id === 2 ? 'Médico' : 'Paciente'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700">{u.rut_dni}</td>
                      <td className="py-3 px-3 font-mono text-slate-600">{u.email}</td>
                      
                      {/* COLUMNA DE CONTRASEÑA CON BOTÓN DE VISUALIZACIÓN */}
                      <td className="py-3 px-3 bg-slate-50/40">
                        <div className="flex items-center gap-2">
                          {isVisible ? (
                            <span className="font-mono text-[11px] font-bold text-teal-950 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                              {passwordText}
                            </span>
                          ) : (
                            <span className="font-mono text-slate-400 tracking-widest text-xs">
                              ••••••••
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(u.id)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                            title={isVisible ? 'Ocultar contraseña' : 'Ver contraseña'}
                          >
                            {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyPassword(u.id, passwordText)}
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              isCopied
                                ? 'text-emerald-700 bg-emerald-100'
                                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'
                            }`}
                            title="Copiar contraseña al portapapeles"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-slate-600">
                        {u.rol_id === 1 ? (u.cargo || 'Dirección') : u.rol_id === 2 ? `${u.especialidad} (${u.numero_colegiado})` : 'Cama asignada'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => {
                            if (confirm(`¿Está seguro de eliminar el usuario "${u.nombre_completo}"?`)) {
                              onDeleteUser(u.id);
                            }
                          }}
                          className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA OVERLAY: FARMACIA E INVENTARIO (Accesible desde el Dashboard) */}
      {dashboardOverlayView === 'farmacia' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDashboardOverlayView('none')}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                title="Volver al Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-teal-800" />
                  Farmacia e Inventario Clínico
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reabastecimiento con control positivo abierto (ingrese cualquier cantidad a recepcionar).
                </p>
              </div>
            </div>

            <button
              onClick={() => setDashboardOverlayView('none')}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Volver al Resumen
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-medium">
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Medicamento / Presentación</th>
                  <th className="py-2.5 px-3">Lote / Vencimiento</th>
                  <th className="py-2.5 px-3 text-right">Stock Actual</th>
                  <th className="py-2.5 px-3 text-right">Stock Mínimo</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3 text-center">Ingreso de Reabastecimiento (Unid.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventory.map(item => {
                  const isAgotado = item.stock_actual <= 0;
                  const isBajo = item.stock_actual <= item.medicamento.stock_minimo;
                  const wasRestocked = restockSuccessId === item.id;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3 font-mono font-medium text-slate-700">
                        {item.medicamento.codigo}
                      </td>
                      <td className="py-3 px-3">
                        <strong className="text-slate-900 block">{item.medicamento.nombre_comercial}</strong>
                        <span className="text-slate-500 text-[11px]">{item.medicamento.principio_activo} · {item.medicamento.presentacion}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono text-slate-700">{item.lote}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">Vence: {item.fecha_vencimiento}</span>
                      </td>
                      <td className={`py-3 px-3 text-right font-mono font-bold text-sm ${
                        isAgotado ? 'text-red-600' : isBajo ? 'text-amber-600' : 'text-emerald-700'
                      }`}>
                        {item.stock_actual}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500">
                        {item.medicamento.stock_minimo}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          isAgotado 
                            ? 'bg-red-50 text-red-700 border border-red-200' 
                            : isBajo 
                            ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {isAgotado ? 'Agotado' : isBajo ? 'Stock Bajo' : 'Disponible'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-1.5 justify-center">
                          <input
                            type="number"
                            min="1"
                            value={restockAmounts[item.id] || 25}
                            onChange={(e) => setRestockAmounts({ ...restockAmounts, [item.id]: Math.max(1, Number(e.target.value)) })}
                            className="w-16 px-2 py-1 border border-slate-300 rounded text-center font-mono text-xs bg-white"
                            placeholder="Cant."
                          />
                          <button
                            onClick={() => handleRestockSingle(item.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded transition-colors cursor-pointer"
                          >
                            + Reabastecer
                          </button>
                          {wasRestocked && (
                            <span className="text-emerald-700 font-bold text-[11px] animate-pulse">
                              ¡Actualizado!
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL PARA CREAR USUARIO (INCLUYE OPCIÓN ADMINISTRADOR Y CAMPO DE CONTRASEÑA) */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                Registrar Nuevo Usuario
              </h3>
              <button 
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Rol a Asignar:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewUserRole(1)}
                    className={`py-1.5 px-2 rounded-lg border font-semibold text-center cursor-pointer ${
                      newUserRole === 1
                        ? 'bg-purple-900 text-white border-purple-950 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Administrador
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewUserRole(2)}
                    className={`py-1.5 px-2 rounded-lg border font-semibold text-center cursor-pointer ${
                      newUserRole === 2
                        ? 'bg-teal-900 text-white border-teal-950 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Médico
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewUserRole(3)}
                    className={`py-1.5 px-2 rounded-lg border font-semibold text-center cursor-pointer ${
                      newUserRole === 3
                        ? 'bg-blue-900 text-white border-blue-950 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Paciente
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Nombre Completo:</label>
                <input
                  type="text"
                  required
                  placeholder={newUserRole === 1 ? 'Lic. Carlos Administrador' : newUserRole === 2 ? 'Dr. Andrés Castro' : 'Manuel Silva'}
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Email Institucional:</label>
                  <input
                    type="email"
                    required
                    placeholder="usuario@hospital.local"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">RUT / DNI:</label>
                  <input
                    type="text"
                    required
                    placeholder="12.345.678-K"
                    value={newRut}
                    onChange={(e) => setNewRut(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-700"
                  />
                </div>
              </div>

              {/* Campo de Contraseña con toggle de visibilidad */}
              <div>
                <label className="block text-slate-700 font-medium mb-1">Contraseña de Acceso:</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-3 pr-9 py-1.5 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-teal-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {newUserRole === 1 && (
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Cargo Administrativo:</label>
                  <input
                    type="text"
                    placeholder="Gestión Asistencial / Coordinación Pabellón"
                    value={newCargo}
                    onChange={(e) => setNewCargo(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                  />
                </div>
              )}

              {newUserRole === 2 && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Especialidad:</label>
                    <input
                      type="text"
                      placeholder="Medicina Interna"
                      value={newEspecialidad}
                      onChange={(e) => setNewEspecialidad(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Colegiado:</label>
                    <input
                      type="text"
                      placeholder="COLMED-67890"
                      value={newColegiado}
                      onChange={(e) => setNewColegiado(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                    />
                  </div>
                </div>
              )}

              {newUserRole === 3 && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Cama Asignada:</label>
                    <input
                      type="text"
                      value={newCama}
                      onChange={(e) => setNewCama(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Diagnóstico Inicial:</label>
                    <textarea
                      rows={2}
                      value={newDiagnostico}
                      onChange={(e) => setNewDiagnostico(e.target.value)}
                      placeholder="Diagnóstico de derivación..."
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  Guardar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
