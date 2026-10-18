import React, { useState } from 'react';
import { AgendaEvent, RoleId, PatientRecord, User, EventType } from '../types/hospital';
import { 
  Clock, 
  Plus, 
  Filter, 
  CalendarDays,
  Lock,
  UserCheck,
  AlertCircle,
  RotateCw
} from 'lucide-react';

interface CalendarAgendaProps {
  currentRole: RoleId;
  events: AgendaEvent[];
  patients: PatientRecord[];
  doctors: User[];
  onAddEvent: (event: Omit<AgendaEvent, 'id'>) => void;
  onCancelEventWithReassignment: (eventId: number, reason: string, reassignedDoctor: User) => void;
  onRescheduleEvent: (eventId: number, newStartTime: string) => void;
}

export const CalendarAgenda: React.FC<CalendarAgendaProps> = ({
  currentRole,
  events,
  patients,
  doctors,
  onAddEvent,
  onCancelEventWithReassignment,
  onRescheduleEvent
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [rescheduleModalId, setRescheduleModalId] = useState<number | null>(null);
  const [newDateTime, setNewDateTime] = useState('');

  // Modal para cancelación obligatoria con motivo y reasignación automática
  const [cancellingEventId, setCancellingEventId] = useState<number | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  // Form states para nueva cita clínica
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventPatientId, setNewEventPatientId] = useState(patients[0]?.id || 1);
  const [newEventDoctorId, setNewEventDoctorId] = useState(doctors[0]?.id || 2);
  const [newEventType, setNewEventType] = useState<EventType>('RONDA_MEDICA');
  const [newEventStart, setNewEventStart] = useState('2026-10-18T10:00');
  const [newEventEnd, setNewEventEnd] = useState('2026-10-18T10:45');

  // Filtrado de eventos según rol
  let roleFilteredEvents = events;
  if (currentRole === 2) {
    // Médico: Ve las citas de las que es responsable o donde ha sido reasignado
    roleFilteredEvents = events.filter(e => e.medico_id === 2 || e.medico_original_nombre?.includes('Morales'));
  } else if (currentRole === 3) {
    // Paciente: Ve sus eventos de post-urgencias
    roleFilteredEvents = events.filter(e => e.paciente_id === 1);
  }

  // Filtrado por tipo de evento
  const displayEvents = roleFilteredEvents.filter(e => {
    if (filterType === 'ALL') return true;
    return e.tipo_evento === filterType;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    const patient = patients.find(p => p.id === Number(newEventPatientId));
    const doctor = doctors.find(d => d.id === Number(newEventDoctorId));

    onAddEvent({
      paciente_id: Number(newEventPatientId),
      paciente_nombre: patient?.nombre_completo || 'Paciente',
      numero_cama: patient?.numero_cama || 'Cama 01',
      medico_id: Number(newEventDoctorId),
      medico_nombre: doctor?.nombre_completo || 'Médico Tratante',
      tipo_evento: newEventType,
      titulo: newEventTitle,
      descripcion: newEventDescription,
      fecha_inicio: newEventStart,
      fecha_fin: newEventEnd,
      estado: 'PROGRAMADA'
    });

    setShowAddModal(false);
    setNewEventTitle('');
    setNewEventDescription('');
  };

  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rescheduleModalId && newDateTime) {
      onRescheduleEvent(rescheduleModalId, newDateTime);
      setRescheduleModalId(null);
      setNewDateTime('');
    }
  };

  // Manejador de cancelación con motivo obligatorio y reasignación automática
  const handleConfirmCancelWithReassignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingEventId || !cancellationReason.trim()) return;

    const event = events.find(ev => ev.id === cancellingEventId);
    if (!event) return;

    // Buscar otro médico disponible en la sala diferente al médico actual
    const otherDoctors = doctors.filter(d => d.id !== event.medico_id && d.rol_id === 2);
    const assignedDoctor = otherDoctors.length > 0 ? otherDoctors[0] : doctors[0];

    onCancelEventWithReassignment(cancellingEventId, cancellationReason.trim(), assignedDoctor);

    setCancellingEventId(null);
    setCancellationReason('');
  };

  return (
    <div className="space-y-6">
      
      {/* Encabezado de la Agenda */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-teal-800" />
              <h2 className="text-base font-bold text-slate-900">
                {currentRole === 1 && 'Agenda General y Horarios Médicos (Supervisión)'}
                {currentRole === 2 && 'Agenda Clínica de Rondas y Procedimientos'}
                {currentRole === 3 && 'Cronograma de Terapias y Medicamentos en Camilla'}
              </h2>
              {currentRole === 1 && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-500" />
                  Modo Solo Lectura
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 mt-1">
              {currentRole === 1 && 'Visualización general de turnos, procedimientos y citas programadas. No se permite reasignar ni cancelar por política administrativa.'}
              {currentRole === 2 && 'Gestión de procedimientos propios. La cancelación exige motivo obligatorio y reasigna automáticamente a otro colega de guardia.'}
              {currentRole === 3 && 'Consulta en camilla de los horarios de administración, terapias y controles médicos.'}
            </p>
          </div>

          {/* El botón de agendar SOLO está disponible para el Médico (rol_id 2). El Administrador tiene modo solo lectura estricto */}
          {currentRole === 2 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Agendar Actividad Clínica
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-600 font-medium">Filtrar por Tipo:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700"
            >
              <option value="ALL">Todas las actividades</option>
              <option value="RONDA_MEDICA">Rondas Médicas</option>
              <option value="ADMINISTRACION_ENDOMED">Administración de Medicamentos</option>
              <option value="TERAPIA_KINESIOLOGIA">Kinesioterapia</option>
              <option value="CURACION">Curaciones y Cuidados</option>
              <option value="CONTROL_POST_ALTA">Control y Epicrisis</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            {displayEvents.length} actividades programadas
          </div>
        </div>
      </div>

      {/* Lista de Eventos de la Agenda */}
      <div className="space-y-3">
        {displayEvents.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
            No se registran actividades programadas con los filtros seleccionados.
          </div>
        ) : (
          displayEvents.map(ev => {
            const isCancelled = ev.estado === 'CANCELADA';
            const isReassigned = ev.estado === 'REASIGNADA';

            return (
              <div
                key={ev.id}
                className={`p-4 rounded-xl border transition-all bg-white flex flex-wrap items-center justify-between gap-4 ${
                  isCancelled
                    ? 'border-red-200 bg-red-50/30'
                    : isReassigned
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-slate-200 hover:border-teal-500'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-100 flex flex-col items-center justify-center shrink-0 min-w-[68px]">
                    <Clock className="w-4 h-4 text-teal-700 mb-0.5" />
                    <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                      {ev.fecha_inicio.substring(11, 16)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {ev.fecha_inicio.substring(8, 10)}/{ev.fecha_inicio.substring(5, 7)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        {ev.titulo}
                      </h4>
                      <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {ev.tipo_evento.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                        ev.estado === 'PROGRAMADA'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : ev.estado === 'REASIGNADA'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : ev.estado === 'CANCELADA'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {ev.estado}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 max-w-xl">
                      {ev.descripcion}
                    </p>

                    {/* Detalle si fue reasignada con motivo */}
                    {ev.motivo_cancelacion && (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 space-y-0.5">
                        <span><strong>Motivo de cancelación previa:</strong> "{ev.motivo_cancelacion}"</span>
                        <div className="text-[10px] text-amber-800 flex items-center gap-1">
                          <RotateCw className="w-3 h-3" />
                          <span>Reasignada automáticamente desde {ev.medico_original_nombre} hacia <strong>{ev.medico_nombre}</strong>.</span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <strong className="text-teal-900 font-mono bg-teal-50 px-1.5 py-0.5 rounded text-[11px]">
                          {ev.numero_cama}
                        </strong>
                        <span>{ev.paciente_nombre}</span>
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-teal-700" />
                        <span>Médico a cargo: <strong>{ev.medico_nombre}</strong></span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* ACCIONES: Solo para MÉDICO (rol_id 2). El Administrador NO puede cancelar ni reasignar */}
                {currentRole === 2 && !isCancelled && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setRescheduleModalId(ev.id);
                        setNewDateTime(ev.fecha_inicio);
                      }}
                      className="px-2.5 py-1 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                      title="Reasignar a otro horario"
                    >
                      Reasignar Horario
                    </button>

                    <button
                      onClick={() => setCancellingEventId(ev.id)}
                      className="px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
                      title="Cancelar cita solicitando motivo y reasignando automáticamente a otro médico"
                    >
                      Cancelar y Reasignar Médico
                    </button>
                  </div>
                )}

                {/* Aviso para el Admin */}
                {currentRole === 1 && (
                  <span className="text-[11px] text-slate-400 font-medium italic">
                    Supervisión activa
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL PARA AGENDAR NUEVA ACTIVIDAD (SOLO MÉDICO) */}
      {showAddModal && currentRole === 2 && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                Agendar Procedimiento Clínico
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Título de la Actividad:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Auscultación matutina y curva térmica"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Paciente / Camilla:</label>
                  <select
                    value={newEventPatientId}
                    onChange={(e) => setNewEventPatientId(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                  >
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>
                        [{p.numero_cama}] {p.nombre_completo}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Médico Asignado:</label>
                  <select
                    value={newEventDoctorId}
                    onChange={(e) => setNewEventDoctorId(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                  >
                    {doctors.filter(d => d.rol_id === 2).map(d => (
                      <option key={d.id} value={d.id}>
                        {d.nombre_completo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Tipo de Procedimiento:</label>
                <select
                  value={newEventType}
                  onChange={(e) => setNewEventType(e.target.value as EventType)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="RONDA_MEDICA">Ronda Médica</option>
                  <option value="ADMINISTRACION_ENDOMED">Administración de Medicamentos</option>
                  <option value="TERAPIA_KINESIOLOGIA">Kinesioterapia Respiratoria/Motora</option>
                  <option value="CURACION">Curación y Cuidados de Enfermería</option>
                  <option value="CONTROL_POST_ALTA">Control y Entrega de Epicrisis</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Inicio:</label>
                  <input
                    type="datetime-local"
                    required
                    value={newEventStart}
                    onChange={(e) => setNewEventStart(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Término:</label>
                  <input
                    type="datetime-local"
                    required
                    value={newEventEnd}
                    onChange={(e) => setNewEventEnd(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Instrucciones Clínicas:</label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre precauciones o insumos requeridos..."
                  value={newEventDescription}
                  onChange={(e) => setNewEventDescription(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  Registrar en Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL OBLIGATORIO DE CANCELACIÓN CON MOTIVO Y REASIGNACIÓN AUTOMÁTICA A OTRO MÉDICO */}
      {cancellingEventId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200 space-y-4">
            <div className="flex items-center gap-2.5 text-red-600 pb-2 border-b border-red-100">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Cancelar y Reasignar Cita Médica
                </h3>
                <p className="text-[11px] text-slate-500">
                  Por norma clínica, debe justificar la cancelación para derivar al paciente automáticamente.
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmCancelWithReassignment} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Motivo Clínico de Cancelación (Obligatorio):
                </label>
                <textarea
                  required
                  rows={3}
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Ej: Médico convocado a urgencia crítica en reanimación / Shockroom..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-red-600 text-xs"
                />
              </div>

              <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-teal-900 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-xs">
                  <RotateCw className="w-3.5 h-3.5 text-teal-700" />
                  Reasignación Automática de Protocolo:
                </span>
                <p className="text-[11px] text-teal-800 leading-snug">
                  La atención será transferida inmediatamente a otro médico especialista de guardia disponible en la sala para garantizar la continuidad del cuidado.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setCancellingEventId(null); setCancellationReason(''); }}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={!cancellationReason.trim()}
                  className={`px-4 py-2 font-bold rounded-lg text-xs transition-colors cursor-pointer ${
                    cancellationReason.trim()
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Confirmar y Reasignar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA REASIGNAR HORARIO */}
      {rescheduleModalId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Reasignar Horario de Cita
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Indique la nueva fecha y hora para este procedimiento.
            </p>

            <form onSubmit={handleRescheduleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Nuevo Horario:</label>
                <input
                  type="datetime-local"
                  required
                  value={newDateTime}
                  onChange={(e) => setNewDateTime(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRescheduleModalId(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors cursor-pointer"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
