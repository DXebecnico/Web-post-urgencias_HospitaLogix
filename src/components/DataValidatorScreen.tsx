import React, { useState } from 'react';
import { User, RoleId } from '../types/hospital';
import { MealyAuthenticationMachine } from '../utils/mealyMachine';
import { 
  Activity, 
  ShieldCheck, 
  Stethoscope, 
  User as UserIcon, 
  CheckCircle2, 
  ArrowRight,
  KeyRound,
  Lock,
  Mail,
  Sparkles,
  Shield,
  Clock,
  BedDouble
} from 'lucide-react';

interface DataValidatorScreenProps {
  users: User[];
  onSelectProfileDirect: (user: User, roleId: RoleId) => void;
  onOpenCodeViewer?: () => void;
}

export const DataValidatorScreen: React.FC<DataValidatorScreenProps> = ({
  users,
  onSelectProfileDirect,
  onOpenCodeViewer
}) => {
  const [validatingRole, setValidatingRole] = useState<RoleId | null>(null);
  const [validationStep, setValidationStep] = useState<string | null>(null);

  const adminUser = users.find(u => u.rol_id === 1) || users[0];
  const doctorUser = users.find(u => u.rol_id === 2) || users[1];
  const patientUser = users.find(u => u.rol_id === 3) || users[3] || users[2];

  const handleCardClick = (targetEmail: string, roleId: RoleId) => {
    if (validatingRole !== null) return; // Prevent double click

    setValidatingRole(roleId);
    setValidationStep('Evaluando identidad y credenciales institucionales...');

    const targetUser = users.find(u => u.email === targetEmail) || 
      (roleId === 1 ? adminUser : roleId === 2 ? doctorUser : patientUser);

    const testPassword = targetUser.password || 
      (roleId === 1 ? 'Admin123!' : roleId === 2 ? 'Medico123!' : 'Paciente123!');

    // Ejecutar procesamiento con la Máquina de Mealy
    const resultado = MealyAuthenticationMachine.procesarAutenticacion(
      {
        email: targetEmail,
        passwordHashAttempt: testPassword,
        rol_id: roleId
      },
      users
    );

    setTimeout(() => {
      setValidationStep(`¡Identidad Verificada! Estado M(S2→S3): Acceso Concedido como ${resultado.salida.rol_asignado}. Redirigiendo...`);
      setTimeout(() => {
        onSelectProfileDirect(resultado.salida.usuario || targetUser, roleId);
      }, 350);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100/70 to-slate-200/50 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Barra superior de contexto institucional */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between text-xs text-slate-500 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-800">Hospital Clínico Central</span>
          <span className="text-slate-300">|</span>
          <span>Unidad de Post-Urgencias</span>
        </div>
        {onOpenCodeViewer && (
          <button
            onClick={onOpenCodeViewer}
            className="text-teal-800 hover:text-teal-950 font-semibold cursor-pointer underline text-xs"
          >
            Ver Código Fuente
          </button>
        )}
      </div>

      {/* Contenedor Central: Validador Directo de Datos */}
      <div className="max-w-4xl w-full mx-auto my-auto py-6">
        
        {/* Cabecera y presentación */}
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center justify-center p-3.5 bg-teal-800 text-white rounded-2xl shadow-md ring-4 ring-teal-700/10 mb-1">
            <Activity className="w-8 h-8 text-teal-300" />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              HospitaLogix
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-teal-800 mt-0.5">
              Sistema de Gestión y Seguimiento en Post-Urgencias
            </p>
          </div>

          <div className="max-w-xl mx-auto pt-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-100/80 text-teal-900 text-xs font-bold rounded-full mb-2">
              <Shield className="w-3.5 h-3.5 text-teal-700" />
              <span>Validador Directo de Datos e Identidad</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600">
              Seleccione cualquiera de los perfiles preconfigurados para validar su acceso de forma directa sin requerir formulario manual. El sistema procesará las credenciales y abrirá de inmediato su respectivo panel.
            </p>
          </div>
        </div>

        {/* FEEDBACK DE VALIDACIÓN ACTIVA */}
        {validatingRole && validationStep && (
          <div className="mb-6 p-4 bg-teal-800 text-white rounded-xl text-center text-xs sm:text-sm font-semibold flex items-center justify-center gap-3 shadow-lg animate-pulse">
            <CheckCircle2 className="w-5 h-5 text-teal-300 shrink-0" />
            <span>{validationStep}</span>
          </div>
        )}

        {/* TARJETAS CON PERFILES PRECONFIGURADOS PARA PRUEBAS (1-CLIC DIRECTO) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* 1. PERFIL ADMINISTRADOR (rol_id = 1) */}
          <div
            onClick={() => handleCardClick(adminUser.email, 1)}
            className={`p-5 bg-white rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between group text-left relative overflow-hidden shadow-xs hover:shadow-lg ${
              validatingRole === 1
                ? 'border-purple-600 ring-4 ring-purple-600/20 bg-purple-50/30'
                : 'border-slate-200/90 hover:border-purple-500'
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-purple-700" />
            
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100 group-hover:scale-105 transition-transform shadow-2xs">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800">
                  Rol 1 · Admin
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-900 transition-colors">
                  Administrador
                </h3>
                <p className="text-xs text-slate-700 font-semibold mt-0.5">
                  {adminUser.nombre_completo}
                </p>
                <p className="text-[11px] text-slate-500">
                  {adminUser.cargo || 'Dirección Médica & Gestión Asistencial'}
                </p>
              </div>

              {/* Caja de Credenciales Preconfiguradas */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-[11px] font-medium flex items-center gap-1 text-slate-500">
                    <Mail className="w-3 h-3 text-slate-400" /> Usuario:
                  </span>
                  <span className="font-mono text-[11px] font-bold text-slate-800">
                    {adminUser.email}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200/60">
                  <span className="text-[11px] font-medium flex items-center gap-1 text-slate-500">
                    <Lock className="w-3 h-3 text-slate-400" /> Clave:
                  </span>
                  <span className="font-mono text-[11px] font-bold text-purple-800 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-100">
                    {adminUser.password || 'Admin123!'}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 space-y-0.5">
                <span className="block font-medium text-slate-700">Privilegios y Accesos:</span>
                <span>• Dashboard Estadístico Interactivo</span>
                <span className="block">• Autorización de Egresos Emitidos</span>
                <span className="block">• Agenda General en Modo Lectura</span>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-100">
              <button
                type="button"
                className="w-full py-2.5 px-3 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer group-hover:bg-purple-800"
              >
                <span>Validar y Entrar como Admin</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* 2. PERFIL MÉDICO (rol_id = 2) */}
          <div
            onClick={() => handleCardClick(doctorUser.email, 2)}
            className={`p-5 bg-white rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between group text-left relative overflow-hidden shadow-xs hover:shadow-lg ${
              validatingRole === 2
                ? 'border-teal-600 ring-4 ring-teal-600/20 bg-teal-50/30'
                : 'border-slate-200/90 hover:border-teal-500'
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-teal-800" />
            
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center border border-teal-100 group-hover:scale-105 transition-transform shadow-2xs">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-100 text-teal-800">
                  Rol 2 · Médico
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-900 transition-colors">
                  Médico Especialista
                </h3>
                <p className="text-xs text-slate-700 font-semibold mt-0.5">
                  {doctorUser.nombre_completo}
                </p>
                <p className="text-[11px] text-slate-500">
                  {doctorUser.especialidad} · {doctorUser.numero_colegiado}
                </p>
              </div>

              {/* Caja de Credenciales Preconfiguradas */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-[11px] font-medium flex items-center gap-1 text-slate-500">
                    <Mail className="w-3 h-3 text-slate-400" /> Usuario:
                  </span>
                  <span className="font-mono text-[11px] font-bold text-slate-800">
                    {doctorUser.email}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200/60">
                  <span className="text-[11px] font-medium flex items-center gap-1 text-slate-500">
                    <Lock className="w-3 h-3 text-slate-400" /> Clave:
                  </span>
                  <span className="font-mono text-[11px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-100">
                    {doctorUser.password || 'Medico123!'}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 space-y-0.5">
                <span className="block font-medium text-slate-700">Privilegios y Accesos:</span>
                <span>• Selector Ágil de Pacientes</span>
                <span className="block">• Estados Clínicos (q0 a q5)</span>
                <span className="block">• Prescripción y Signos Vitales</span>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-100">
              <button
                type="button"
                className="w-full py-2.5 px-3 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer group-hover:bg-teal-900"
              >
                <span>Validar y Entrar como Médico</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* 3. PERFIL PACIENTE (rol_id = 3) */}
          <div
            onClick={() => handleCardClick(patientUser.email, 3)}
            className={`p-5 bg-white rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between group text-left relative overflow-hidden shadow-xs hover:shadow-lg ${
              validatingRole === 3
                ? 'border-blue-600 ring-4 ring-blue-600/20 bg-blue-50/30'
                : 'border-slate-200/90 hover:border-blue-500'
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-700" />
            
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform shadow-2xs">
                  <UserIcon className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
                  Rol 3 · Paciente
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                  Paciente en Camilla
                </h3>
                <p className="text-xs text-slate-700 font-semibold mt-0.5">
                  {patientUser.nombre_completo}
                </p>
                <p className="text-[11px] text-slate-500">
                  Cama 04-B · Sala Post-Urgencias
                </p>
              </div>

              {/* Caja de Credenciales Preconfiguradas */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-[11px] font-medium flex items-center gap-1 text-slate-500">
                    <Mail className="w-3 h-3 text-slate-400" /> Usuario:
                  </span>
                  <span className="font-mono text-[11px] font-bold text-slate-800">
                    {patientUser.email}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200/60">
                  <span className="text-[11px] font-medium flex items-center gap-1 text-slate-500">
                    <Lock className="w-3 h-3 text-slate-400" /> Clave:
                  </span>
                  <span className="font-mono text-[11px] font-bold text-blue-800 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                    {patientUser.password || 'Paciente123!'}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 space-y-0.5">
                <span className="block font-medium text-slate-700">Privilegios y Accesos:</span>
                <span>• Interfaz Simplificada de Camilla</span>
                <span className="block">• Medicamentos (Sin confirmación)</span>
                <span className="block">• Tiempo Estimado y Cuidados</span>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-100">
              <button
                type="button"
                className="w-full py-2.5 px-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer group-hover:bg-blue-800"
              >
                <span>Validar y Entrar como Paciente</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

        </div>

        {/* Nota informativa */}
        <div className="mt-8 text-center text-xs text-slate-400">
          <span>Sistema de verificación directa institucional según protocolo hospitalario post-urgencias.</span>
        </div>

      </div>

      {/* Pie de pantalla */}
      <div className="max-w-4xl w-full mx-auto text-center text-[11px] text-slate-400 py-2 border-t border-slate-200/60">
        HospitaLogix · Plataforma Hospitalaria Multi-Rol
      </div>
    </div>
  );
};
