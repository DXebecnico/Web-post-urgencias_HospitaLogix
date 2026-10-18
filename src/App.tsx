/**
 * HospitaLogix - Plataforma Web Multi-Rol de Gestión y Seguimiento en Post-Urgencias
 * Administrador (rol_id = 1), Médico (rol_id = 2), Paciente (rol_id = 3)
 */

import React, { useState } from 'react';
import { 
  RoleId, 
  PatientRecord, 
  User, 
  InventoryItem, 
  Prescription, 
  VitalSigns, 
  ClinicalLogEvent, 
  DischargeRequest, 
  AgendaEvent, 
  AutomataState 
} from './types/hospital';
import { 
  INITIAL_PATIENTS, 
  INITIAL_USERS, 
  INITIAL_INVENTORY, 
  INITIAL_PRESCRIPTIONS, 
  INITIAL_VITALS, 
  INITIAL_LOGS, 
  INITIAL_DISCHARGE_REQUESTS, 
  INITIAL_AGENDA, 
  INITIAL_MEDICATIONS 
} from './data/initialData';

import { Header } from './components/Header';
import { AdminPanel } from './components/AdminPanel';
import { DoctorPanel } from './components/DoctorPanel';
import { PatientPanel } from './components/PatientPanel';
import { CalendarAgenda } from './components/CalendarAgenda';
import { CodeViewerModal } from './components/CodeViewerModal';
import { DataValidatorScreen } from './components/DataValidatorScreen';
import { validateDischargeGuards } from './utils/automataEngine';

export default function App() {
  // Estado de sesión activa: se inicia en false para mostrar primero el Validador de Datos e Identidad
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);

  // Datos centrales
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[0]); // Dra. Elena Ramos (Admin)
  const [currentRole, setCurrentRole] = useState<RoleId>(1);
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Modales
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);

  // Estados del sistema clínico
  const [patients, setPatients] = useState<PatientRecord[]>(INITIAL_PATIENTS);
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(INITIAL_PRESCRIPTIONS);
  const [vitalsHistory, setVitalsHistory] = useState<VitalSigns[]>(INITIAL_VITALS);
  const [logs, setLogs] = useState<ClinicalLogEvent[]>(INITIAL_LOGS);
  const [dischargeRequests, setDischargeRequests] = useState<DischargeRequest[]>(INITIAL_DISCHARGE_REQUESTS);
  const [agendaEvents, setAgendaEvents] = useState<AgendaEvent[]>(INITIAL_AGENDA);

  // Paciente seleccionado en la estación médica (por defecto Lucía Vargas, Cama 04-B)
  const [selectedPatientId, setSelectedPatientId] = useState<number>(1);

  // Cambio de usuario en simulación rápida desde la cabecera
  const handleSelectSimulatedUser = (user: User) => {
    setCurrentUser(user);
    setCurrentRole(user.rol_id);
    if (user.rol_id === 1) setActiveTab('dashboard');
    if (user.rol_id === 2) setActiveTab('clinica');
    if (user.rol_id === 3) {
      const foundPatient = patients.find(p => p.usuario_id === user.id) || patients[0];
      setSelectedPatientId(foundPatient.id);
      setActiveTab('paciente');
    }
  };

  // Cambio de paciente desde el mapa de camas
  const handleSelectPatientByBed = (patientId: number) => {
    setSelectedPatientId(patientId);
    setCurrentRole(2);
    const doctorUser = users.find(u => u.rol_id === 2) || users[1];
    setCurrentUser(doctorUser);
    setActiveTab('clinica');
  };

  // 1. Manejo de Autorización de Egresos Médicos (Salida Administrativa)
  const handleApproveDischarge = (requestId: number, notes?: string) => {
    const request = dischargeRequests.find(r => r.id === requestId);
    if (!request) return;

    setDischargeRequests(prev => prev.map(r => r.id === requestId ? {
      ...r,
      estado: 'APROBADA',
      fecha_resolucion: new Date().toLocaleString(),
      admin_aprobador_id: currentUser.id
    } : r));

    // Pasar paciente al estado terminal q5 (Paciente Dado de Alta / Inactivo)
    setPatients(prev => prev.map(p => p.id === request.paciente_id ? {
      ...p,
      estado_automata: 'q5'
    } : p));

    const newLog: ClinicalLogEvent = {
      id: Date.now(),
      paciente_id: request.paciente_id,
      medico_id: currentUser.id,
      medico_nombre: `${currentUser.nombre_completo} (Dirección)`,
      estado_previo: 'q3',
      estado_nuevo: 'q5',
      accion_evento: 'AUTORIZACION_EGRESO',
      observaciones: notes ? `Egreso formalmente autorizado: ${notes}` : 'Egreso administrativo formalizado por Dirección tras el dictamen emitido por el médico tratante.',
      fecha_registro: 'Ahora'
    };
    setLogs(prev => [newLog, ...prev]);
  };

  const handleRejectDischarge = (requestId: number, reason: string) => {
    const request = dischargeRequests.find(r => r.id === requestId);
    if (!request) return;

    setDischargeRequests(prev => prev.map(r => r.id === requestId ? {
      ...r,
      estado: 'RECHAZADA',
      motivo_rechazo: reason,
      fecha_resolucion: new Date().toLocaleString(),
      admin_aprobador_id: currentUser.id
    } : r));

    // Mantener o retornar a q2 (Observación y Monitoreo)
    setPatients(prev => prev.map(p => p.id === request.paciente_id ? {
      ...p,
      estado_automata: 'q2'
    } : p));

    const newLog: ClinicalLogEvent = {
      id: Date.now(),
      paciente_id: request.paciente_id,
      medico_id: currentUser.id,
      medico_nombre: `${currentUser.nombre_completo} (Dirección)`,
      estado_previo: 'q3',
      estado_nuevo: 'q2',
      accion_evento: 'OBSERVACION_EGRESO',
      observaciones: `Egreso observado por Dirección: ${reason}`,
      fecha_registro: 'Ahora'
    };
    setLogs(prev => [newLog, ...prev]);
  };

  // 2. Reabastecer Inventario (cualquier número positivo sin límite prefijado)
  const handleRestockInventory = (inventoryId: number, amount: number) => {
    if (amount <= 0) return;
    setInventory(prev => prev.map(item => item.id === inventoryId ? {
      ...item,
      stock_actual: item.stock_actual + amount
    } : item));
  };

  // 3. Gestión de Usuarios (Crear Administrador, Médico o Paciente con contraseña registrada)
  const handleAddUser = (userData: Partial<User>, doctorData?: any, patientData?: any) => {
    const newUserId = users.length + 1;
    const newUser: User = {
      id: newUserId,
      rol_id: userData.rol_id || 1,
      nombre_completo: userData.nombre_completo || 'Usuario Nuevo',
      email: userData.email || 'usuario@hospital.local',
      password: userData.password || 'Hospital2026!',
      rut_dni: userData.rut_dni || '11.222.333-4',
      telefono: userData.telefono || '+56 9 1234 5678',
      activo: true,
      cargo: userData.cargo,
      especialidad: userData.especialidad,
      numero_colegiado: userData.numero_colegiado
    };

    setUsers(prev => [...prev, newUser]);

    if (userData.rol_id === 3 && patientData) {
      const newPatientId = patients.length + 1;
      const newPatient: PatientRecord = {
        id: newPatientId,
        usuario_id: newUserId,
        nombre_completo: newUser.nombre_completo,
        rut_dni: newUser.rut_dni,
        numero_cama: patientData.numero_cama || `Cama 0${newPatientId}-A`,
        diagnostico_ingreso: patientData.diagnostico_ingreso || 'Ingreso post-urgencia en observación',
        fecha_ingreso: new Date().toLocaleString(),
        grupo_sanguineo: patientData.grupo_sanguineo || 'O+',
        alergias: patientData.alergias || 'Ninguna conocida',
        estado_automata: 'q2',
        medico_asignado_id: 2,
        medico_asignado_nombre: 'Dr. Mateo Morales',
        tiempo_estimado_alta: 'En 48 horas',
        recomendaciones_medicas: 'Reposo en camilla, hidratación fraccionada y monitoreo basal.'
      };
      setPatients(prev => [...prev, newPatient]);
    }
  };

  // 4. Eliminar Usuario
  const handleDeleteUser = (userId: number) => {
    if (currentUser.id === userId) {
      const other = users.find(u => u.id !== userId) || users[0];
      setCurrentUser(other);
      setCurrentRole(other.rol_id);
    }
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  // 5. Signos Vitales
  const handleAddVitals = (vitalsData: Omit<VitalSigns, 'id' | 'fecha_toma'>) => {
    const newVitals: VitalSigns = {
      ...vitalsData,
      id: Date.now(),
      fecha_toma: 'Ahora mismo'
    };

    setVitalsHistory(prev => [newVitals, ...prev]);

    setPatients(prev => prev.map(p => p.id === vitalsData.paciente_id ? {
      ...p,
      signos_actuales: newVitals
    } : p));

    const newLog: ClinicalLogEvent = {
      id: Date.now(),
      paciente_id: vitalsData.paciente_id,
      medico_id: vitalsData.medico_id,
      medico_nombre: 'Dr. Mateo Morales',
      estado_previo: patients.find(p => p.id === vitalsData.paciente_id)?.estado_automata || 'q2',
      estado_nuevo: vitalsData.estado_alerta !== 'NORMAL' ? 'q4' : 'q2',
      accion_evento: 'CONTROL_SIGNOS',
      observaciones: vitalsData.comentarios_clinicos,
      signos_resumen: `PA ${vitalsData.presion_sistolica}/${vitalsData.presion_diastolica}, FC ${vitalsData.frecuencia_cardiaca}, SpO2 ${vitalsData.saturacion_oxigeno}%, Temp ${vitalsData.temperatura}°C (${vitalsData.estado_alerta})`,
      fecha_registro: 'Ahora'
    };
    setLogs(prev => [newLog, ...prev]);
  };

  // 6. Prescripción Médica con validación de Stock
  const handleAddPrescription = (prescriptionData: any): { success: boolean; error?: string } => {
    const invItem = inventory.find(i => i.medicamento_id === prescriptionData.medicamento_id);
    if (!invItem) {
      return { success: false, error: 'Medicamento no registrado en inventario.' };
    }

    if (invItem.stock_actual < prescriptionData.dosis_totales) {
      return {
        success: false,
        error: `Stock insuficiente en farmacia. Stock actual: ${invItem.stock_actual} unidades. Solicite reabastecimiento.`
      };
    }

    // Descontar inventario evitando números negativos
    setInventory(prev => prev.map(item => item.id === invItem.id ? {
      ...item,
      stock_actual: item.stock_actual - prescriptionData.dosis_totales,
      cantidad_utilizada: item.cantidad_utilizada + prescriptionData.dosis_totales
    } : item));

    const newPrescription: Prescription = {
      id: Date.now(),
      paciente_id: prescriptionData.paciente_id,
      medico_id: prescriptionData.medico_id,
      medico_nombre: 'Dr. Mateo Morales',
      medicamento_id: prescriptionData.medicamento_id,
      medicamento: prescriptionData.medicamento,
      posologia_formato: prescriptionData.posologia_formato,
      dosis_totales: prescriptionData.dosis_totales,
      dosis_administradas: 0,
      dosis_pendientes: prescriptionData.dosis_totales,
      indicaciones_especiales: prescriptionData.indicaciones_especiales,
      estado: 'ACTIVA',
      fecha_prescripcion: new Date().toLocaleString()
    };

    setPrescriptions(prev => [newPrescription, ...prev]);

    const newLog: ClinicalLogEvent = {
      id: Date.now(),
      paciente_id: prescriptionData.paciente_id,
      medico_id: prescriptionData.medico_id,
      medico_nombre: 'Dr. Mateo Morales',
      estado_previo: 'q2',
      estado_nuevo: 'q3',
      accion_evento: 'PRESCRIPCION_EMITIDA',
      observaciones: `Prescrito ${prescriptionData.medicamento.nombre_comercial} (${prescriptionData.posologia_formato}). Descontadas ${prescriptionData.dosis_totales} dosis.`,
      fecha_registro: 'Ahora'
    };
    setLogs(prev => [newLog, ...prev]);

    return { success: true };
  };

  // 7. Administrar dosis para reducir pendientes y probar cumplimiento
  const handleAdministerDose = (prescriptionId: number) => {
    setPrescriptions(prev => prev.map(p => {
      if (p.id === prescriptionId && p.dosis_pendientes > 0) {
        const remaining = p.dosis_pendientes - 1;
        return {
          ...p,
          dosis_administradas: p.dosis_administradas + 1,
          dosis_pendientes: remaining,
          estado: remaining === 0 ? 'FINALIZADA' : 'ACTIVA'
        };
      }
      return p;
    }));
  };

  // 8. Transición en el Autómata de 6 Estados (q0 a q5)
  const handleTransitionAutomata = (patientId: number, targetState: AutomataState, eventLabel: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    // Validación estricta para q5 (Paciente Dado de Alta)
    if (targetState === 'q5') {
      const latestV = vitalsHistory.find(v => v.paciente_id === patientId);
      const guard = validateDischargeGuards(patient, latestV, prescriptions);
      if (!guard.canDischarge) {
        alert(`Condición de Seguridad Hospitalaria: No se puede emitir el egreso del paciente.\n\n${guard.blockers.join('\n')}`);
        return;
      }

      // Si cumple todos los requisitos clínicos, el Médico emite la orden y se envía solicitud administrativa a Dirección
      const newDischargeReq: DischargeRequest = {
        id: Date.now(),
        paciente_id: patient.id,
        paciente_nombre: patient.nombre_completo,
        numero_cama: patient.numero_cama,
        diagnostico: patient.diagnostico_ingreso,
        medico_solicitante_id: 2,
        medico_solicitante_nombre: 'Dr. Mateo Morales',
        resumen_clinico: `Paciente ${patient.nombre_completo} evaluado favorablemente. Signos vitales normales, tratamiento completo, afebril y sin signos de alarma en sala post-urgencias.`,
        criterios_cumplidos: [
          'Estabilidad hemodinámica y respiratoria comprobada',
          'Cero dosis pendientes de medicación parenteral',
          'Monitoreo de signos vitales normal y sin alertas',
          'Tolerancia digestiva y reposo completados'
        ],
        estado: 'PENDIENTE',
        fecha_solicitud: new Date().toLocaleString()
      };
      setDischargeRequests(prev => [newDischargeReq, ...prev]);
    }

    setPatients(prev => prev.map(p => p.id === patientId ? {
      ...p,
      estado_automata: targetState
    } : p));

    const newLog: ClinicalLogEvent = {
      id: Date.now(),
      paciente_id: patient.id,
      medico_id: 2,
      medico_nombre: 'Dr. Mateo Morales',
      estado_previo: patient.estado_automata,
      estado_nuevo: targetState,
      accion_evento: eventLabel,
      observaciones: `Cambio de estado formal a [${targetState}].`,
      fecha_registro: 'Ahora'
    };
    setLogs(prev => [newLog, ...prev]);
  };

  // 9. Agenda y Citas
  const handleAddAgendaEvent = (eventData: Omit<AgendaEvent, 'id'>) => {
    const newEvent: AgendaEvent = {
      ...eventData,
      id: Date.now()
    };
    setAgendaEvents(prev => [...prev, newEvent]);
  };

  // Cancelar cita con motivo obligatorio y reasignación automática a otro médico
  const handleCancelEventWithReassignment = (eventId: number, reason: string, reassignedDoctor: User) => {
    setAgendaEvents(prev => prev.map(ev => {
      if (ev.id === eventId) {
        return {
          ...ev,
          estado: 'REASIGNADA',
          motivo_cancelacion: reason,
          medico_original_nombre: ev.medico_nombre,
          medico_id: reassignedDoctor.id,
          medico_nombre: reassignedDoctor.nombre_completo,
          descripcion: `${ev.descripcion} (Transferida a ${reassignedDoctor.nombre_completo} por motivo: ${reason})`
        };
      }
      return ev;
    }));
  };

  const handleRescheduleAgendaEvent = (eventId: number, newStartTime: string) => {
    setAgendaEvents(prev => prev.map(e => e.id === eventId ? {
      ...e,
      fecha_inicio: newStartTime,
      estado: 'REASIGNADA'
    } : e));
  };

  const pendingDischargesCount = dischargeRequests.filter(r => r.estado === 'PENDIENTE').length;

  // 1. PANTALLA INICIAL: VALIDADOR DIRECTO DE DATOS E IDENTIDAD (SIN FORMULARIO TRADICIONAL)
  if (!isSessionActive) {
    return (
      <>
        <DataValidatorScreen
          users={users}
          onSelectProfileDirect={(selectedUser, roleId) => {
            setCurrentUser(selectedUser);
            setCurrentRole(roleId);
            setIsSessionActive(true);
            if (roleId === 1) setActiveTab('dashboard');
            if (roleId === 2) setActiveTab('clinica');
            if (roleId === 3) {
              const foundPatient = patients.find(p => p.usuario_id === selectedUser.id) || patients[0];
              setSelectedPatientId(foundPatient.id);
              setActiveTab('paciente');
            }
          }}
          onOpenCodeViewer={() => setIsCodeModalOpen(true)}
        />

        <CodeViewerModal
          isOpen={isCodeModalOpen}
          onClose={() => setIsCodeModalOpen(false)}
        />
      </>
    );
  }

  // 2. ENTORNO DE TRABAJO CLÍNICO AUTORIZADO
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      
      {/* Cabecera con selector de perfil y navegación limpia */}
      <Header
        currentRole={currentRole}
        currentUser={currentUser}
        allUsers={users}
        onSelectUser={handleSelectSimulatedUser}
        onRoleChange={(newRole) => {
          setCurrentRole(newRole);
          const found = users.find(u => u.rol_id === newRole) || users[0];
          setCurrentUser(found);
          if (newRole === 1) setActiveTab('dashboard');
          if (newRole === 2) setActiveTab('clinica');
          if (newRole === 3) setActiveTab('paciente');
        }}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenCodeViewer={() => setIsCodeModalOpen(true)}
        onLogoutToValidator={() => setIsSessionActive(false)}
        pendingDischargesCount={pendingDischargesCount}
      />

      {/* Área Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* VISTA 1: ADMINISTRADOR (rol_id = 1) */}
        {currentRole === 1 && (
          <>
            {activeTab === 'agenda' ? (
              <CalendarAgenda
                currentRole={1} // Modo solo lectura para Admin
                events={agendaEvents}
                patients={patients}
                doctors={users.filter(u => u.rol_id === 2)}
                onAddEvent={handleAddAgendaEvent}
                onCancelEventWithReassignment={handleCancelEventWithReassignment}
                onRescheduleEvent={handleRescheduleAgendaEvent}
              />
            ) : (
              <AdminPanel
                patients={patients}
                users={users}
                inventory={inventory}
                dischargeRequests={dischargeRequests}
                onApproveDischarge={handleApproveDischarge}
                onRejectDischarge={handleRejectDischarge}
                onRestockInventory={handleRestockInventory}
                onAddUser={handleAddUser}
                onDeleteUser={handleDeleteUser}
                onSelectPatientByBed={handleSelectPatientByBed}
                activeSubTab={activeTab === 'egresos' ? 'egresos' : 'dashboard'}
              />
            )}
          </>
        )}

        {/* VISTA 2: MÉDICO (rol_id = 2) */}
        {currentRole === 2 && (
          <>
            {activeTab === 'agenda' ? (
              <CalendarAgenda
                currentRole={2}
                events={agendaEvents}
                patients={patients}
                doctors={users.filter(u => u.rol_id === 2)}
                onAddEvent={handleAddAgendaEvent}
                onCancelEventWithReassignment={handleCancelEventWithReassignment}
                onRescheduleEvent={handleRescheduleAgendaEvent}
              />
            ) : (
              <DoctorPanel
                patients={patients}
                selectedPatientId={selectedPatientId}
                onSelectPatient={setSelectedPatientId}
                vitalsHistory={vitalsHistory}
                prescriptions={prescriptions}
                catalogMedications={INITIAL_MEDICATIONS}
                logs={logs}
                onAddVitals={handleAddVitals}
                onAddPrescription={handleAddPrescription}
                onAdministerDose={handleAdministerDose}
                onTransitionAutomata={handleTransitionAutomata}
              />
            )}
          </>
        )}

        {/* VISTA 3: PACIENTE (rol_id = 3) */}
        {currentRole === 3 && (
          <>
            {activeTab === 'agenda' ? (
              <CalendarAgenda
                currentRole={3}
                events={agendaEvents}
                patients={patients}
                doctors={users.filter(u => u.rol_id === 2)}
                onAddEvent={handleAddAgendaEvent}
                onCancelEventWithReassignment={handleCancelEventWithReassignment}
                onRescheduleEvent={handleRescheduleAgendaEvent}
              />
            ) : (
              <PatientPanel
                patient={patients.find(p => p.id === selectedPatientId) || patients[0]}
                prescriptions={prescriptions}
                agendaEvents={agendaEvents}
              />
            )}
          </>
        )}

      </main>

      {/* Pie de página clínico limpio sin etiquetas técnicas prohibidas */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <strong>HospitaLogix</strong>
            <span>·</span>
            <span>Sistema Clínico Post-Urgencias</span>
            <span>·</span>
            <span>Hospital Clínico Central</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSessionActive(false)}
              className="text-teal-800 hover:text-teal-950 font-semibold cursor-pointer"
            >
              Validador de Identidad
            </button>
            <span>·</span>
            <button
              onClick={() => setIsCodeModalOpen(true)}
              className="hover:text-slate-900 transition-colors font-semibold text-teal-800 cursor-pointer"
            >
              Ver Código Fuente
            </button>
            <span>·</span>
            <span>Monitoreo Activo</span>
          </div>
        </div>
      </footer>

      {/* Modal de Código Fuente */}
      <CodeViewerModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
      />

    </div>
  );
}
