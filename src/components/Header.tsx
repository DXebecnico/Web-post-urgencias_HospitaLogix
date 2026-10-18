import React from 'react';
import { RoleId, User } from '../types/hospital';
import { 
  Activity, 
  ShieldCheck, 
  Stethoscope, 
  User as UserIcon, 
  Code2, 
  LogOut, 
  KeyRound,
  FileCheck
} from 'lucide-react';

interface HeaderProps {
  currentRole: RoleId;
  currentUser: User;
  allUsers: User[];
  onSelectUser: (user: User) => void;
  onRoleChange: (role: RoleId) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenCodeViewer: () => void;
  onLogoutToValidator: () => void;
  pendingDischargesCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  currentUser,
  allUsers,
  onSelectUser,
  onRoleChange,
  activeTab,
  onTabChange,
  onOpenCodeViewer,
  onLogoutToValidator,
  pendingDischargesCount
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-6 h-16">
          
          {/* Marca e Identificador del Sistema */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-teal-800 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-xs">
              <Activity className="w-5 h-5 text-teal-300" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
              HospitaLogix
            </span>
            <span className="hidden sm:inline-block text-xs font-medium text-slate-400 pl-2 border-l border-slate-200">
              Salas de Post-Urgencias
            </span>
          </div>

          {/* Enlaces de Navegación según el Rol Activo */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            {currentRole === 1 && (
              <>
                <button
                  onClick={() => onTabChange('dashboard')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'dashboard' ? 'text-teal-800 font-semibold border-b-2 border-teal-800 py-5' : ''
                  }`}
                >
                  Dashboard
                </button>

                {/* Sección Renombrada: AUTORIZACIÓN DE EGRESOS (sin la palabra 'Altas') */}
                <button
                  onClick={() => onTabChange('egresos')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 relative cursor-pointer ${
                    activeTab === 'egresos' ? 'text-teal-800 font-semibold border-b-2 border-teal-800 py-5' : ''
                  }`}
                >
                  Autorización de Egresos
                  {pendingDischargesCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500 text-white">
                      {pendingDischargesCount}
                    </span>
                  )}
                </button>

                {/* Nota: FARMACIA y PERSONAL Y PACIENTES fueron removidos del menú entre Dashboard y Agenda General */}

                <button
                  onClick={() => onTabChange('agenda')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'agenda' ? 'text-teal-800 font-semibold border-b-2 border-teal-800 py-5' : ''
                  }`}
                >
                  Agenda General
                </button>
              </>
            )}

            {currentRole === 2 && (
              <>
                <button
                  onClick={() => onTabChange('clinica')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'clinica' ? 'text-teal-800 font-semibold border-b-2 border-teal-800 py-5' : ''
                  }`}
                >
                  Estación Clínica
                </button>
                <button
                  onClick={() => onTabChange('agenda')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'agenda' ? 'text-teal-800 font-semibold border-b-2 border-teal-800 py-5' : ''
                  }`}
                >
                  Rondas y Procedimientos
                </button>
              </>
            )}

            {currentRole === 3 && (
              <>
                <button
                  onClick={() => onTabChange('paciente')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'paciente' ? 'text-teal-800 font-semibold border-b-2 border-teal-800 py-5' : ''
                  }`}
                >
                  Mi Estado en Camilla
                </button>
                <button
                  onClick={() => onTabChange('agenda')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'agenda' ? 'text-teal-800 font-semibold border-b-2 border-teal-800 py-5' : ''
                  }`}
                >
                  Horario de Terapias
                </button>
              </>
            )}
          </nav>

          {/* Zona de Acciones: Selector de Perfil Rápido + Validador / Salir + Código Fuente */}
          <div className="flex items-center gap-2.5 shrink-0">
            
            {/* SELECTOR DE PERFIL (SIMULACIÓN DE USUARIO EN TIEMPO REAL) */}
            <div className="relative inline-flex items-center">
              <label htmlFor="user-simulator-select" className="sr-only">Simular Usuario</label>
              <div className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors">
                {currentRole === 1 && <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />}
                {currentRole === 2 && <Stethoscope className="w-3.5 h-3.5 text-teal-700" />}
                {currentRole === 3 && <UserIcon className="w-3.5 h-3.5 text-blue-700" />}
                
                <select
                  id="user-simulator-select"
                  value={currentUser.id}
                  onChange={(e) => {
                    const found = allUsers.find(u => u.id === Number(e.target.value));
                    if (found) {
                      onSelectUser(found);
                      onRoleChange(found.rol_id);
                    }
                  }}
                  className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer max-w-[120px] sm:max-w-[170px] truncate"
                  title="Cambiar perspectiva de usuario rápidamente"
                >
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.nombre_completo} ({u.rol_id === 1 ? 'Admin' : u.rol_id === 2 ? 'Médico' : 'Paciente'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Botón para volver al Validador Directo de Datos e Identidad */}
            <button
              onClick={onLogoutToValidator}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-slate-200 shadow-2xs"
              title="Volver a la pantalla del Validador Directo de Datos con credenciales de prueba"
            >
              <KeyRound className="w-3.5 h-3.5 text-teal-700" />
              <span className="hidden sm:inline">Validador de Datos</span>
            </button>

            {/* Ver Código Fuente */}
            <button
              onClick={onOpenCodeViewer}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer border border-slate-200"
              title="Explorar y descargar código fuente completo"
            >
              <Code2 className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden lg:inline">Código Fuente</span>
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
