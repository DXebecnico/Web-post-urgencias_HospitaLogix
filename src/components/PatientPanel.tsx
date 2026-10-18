import React, { useState } from 'react';
import { PatientRecord, Prescription, AgendaEvent } from '../types/hospital';
import { 
  Bell, 
  Pill, 
  Clock, 
  Apple, 
  Bed, 
  CheckCircle2, 
  FileText,
  CalendarDays,
  ShieldCheck,
  Heart
} from 'lucide-react';

interface PatientPanelProps {
  patient: PatientRecord;
  prescriptions: Prescription[];
  agendaEvents: AgendaEvent[];
}

export const PatientPanel: React.FC<PatientPanelProps> = ({
  patient,
  prescriptions,
  agendaEvents
}) => {
  const [nurseCallSent, setNurseCallSent] = useState(false);

  const activePrescriptions = prescriptions.filter(p => p.paciente_id === patient.id && p.estado === 'ACTIVA');
  const patientEvents = agendaEvents.filter(e => e.paciente_id === patient.id);

  // Explicación empática del estado del autómata formal q0 a q5 para el paciente
  const humanStateMap: Record<string, { title: string; subtitle: string; tip: string }> = {
    'q0': {
      title: 'Validación Inicial',
      subtitle: 'Comprobación de ingreso y antecedentes en sistema.',
      tip: 'Reposo en cama mientras se completa la verificación.'
    },
    'q1': {
      title: 'Ingreso Administrativo Confirmado',
      subtitle: 'Camilla asignada y ficha clínica abierta para tu seguimiento.',
      tip: 'El equipo médico iniciará tu valoración en breve.'
    },
    'q2': {
      title: 'En Observación y Monitoreo Continuo',
      subtitle: 'Te encuentras en fase de vigilancia basal por los especialistas.',
      tip: 'Mantén la posición recomendada y reposo relativo en camilla.'
    },
    'q3': {
      title: 'Recibiendo Tratamiento Farmacológico',
      subtitle: 'El equipo de enfermería te administra tu pauta de medicación programada.',
      tip: 'No necesitas confirmar las tomas; enfermería registra cada dosis por ti.'
    },
    'q4': {
      title: 'Vigilancia Prioritaria Activa',
      subtitle: 'El personal médico está monitoreando atentamente tus signos vitales.',
      tip: 'Descansa tranquilamente; el equipo está asistiendo tu evolución.'
    },
    'q5': {
      title: '¡Alta Hospitalaria Aprobada!',
      subtitle: 'Tu médico y la Dirección han autorizado tu egreso de la sala.',
      tip: 'En breve te entregaremos tu informe médico y receta para el hogar.'
    }
  };

  const currentHuman = humanStateMap[patient.estado_automata] || {
    title: 'En Cuidado Post-Urgencias',
    subtitle: 'Seguimiento clínico permanente.',
    tip: 'Descanso en camilla.'
  };

  const handleCallNurse = () => {
    setNurseCallSent(true);
    setTimeout(() => {
      setNurseCallSent(false);
    }, 8000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Banner Principal de Camilla */}
      <div className="bg-teal-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-800/80 border border-teal-700 rounded-full text-xs font-semibold text-teal-200">
              <Bed className="w-3.5 h-3.5" />
              {patient.numero_cama} · Sala de Post-Urgencias
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Hola, {patient.nombre_completo.split(' ')[0]}
            </h2>

            <div className="pt-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black bg-teal-800 text-teal-200 px-2 py-0.5 rounded border border-teal-700">
                  [{patient.estado_automata}]
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-300">
                  {currentHuman.title}
                </span>
              </div>
              <p className="text-sm sm:text-base text-teal-100 leading-relaxed mt-1">
                {currentHuman.subtitle}
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-4 rounded-xl border border-white/15 text-xs space-y-1.5 shrink-0 min-w-[200px]">
            <span className="text-teal-200 block text-[11px] font-medium">Médico a Cargo:</span>
            <strong className="text-sm font-semibold block text-white">{patient.medico_asignado_nombre}</strong>
            <span className="text-teal-300 block text-[11px]">Especialista en Post-Urgencias</span>
            
            <div className="pt-2 border-t border-white/15 text-[11px] text-teal-200 flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3" />
              <span>Ingreso: {patient.fecha_ingreso}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-teal-800 flex items-center gap-2 text-xs text-teal-200">
          <span className="font-semibold text-white">Indicación actual:</span>
          <span>{currentHuman.tip}</span>
        </div>
      </div>

      {/* APARTADO DESTACADO: RECOMENDACIONES MÉDICAS ESCRITAS POR EL MÉDICO A CARGO */}
      <div className="bg-white border-2 border-teal-700/30 rounded-2xl p-6 shadow-xs space-y-3 bg-gradient-to-r from-teal-50/40 via-white to-white">
        <div className="flex items-center gap-2.5 pb-2 border-b border-teal-100">
          <div className="p-2 bg-teal-100 text-teal-800 rounded-lg">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Recomendaciones del Médico Encargado
            </h3>
            <p className="text-xs text-slate-500">
              Instrucciones personalizadas indicadas por {patient.medico_asignado_nombre} para su pronta recuperación.
            </p>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-teal-200/80 text-sm text-slate-800 leading-relaxed shadow-xs">
          <p className="font-medium whitespace-pre-line">
            "{patient.recomendaciones_medicas || 'Mantener reposo asistido en camilla a 30 grados, hidratación controlada y avisar ante cualquier dolor o molestia.'}"
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs text-slate-600">
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg">
            <Apple className="w-4 h-4 text-emerald-600 shrink-0" />
            <span><strong>Régimen:</strong> Dieta blanda liviana hiposódica e hidratación fraccionada.</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg">
            <Bed className="w-4 h-4 text-blue-600 shrink-0" />
            <span><strong>Posición:</strong> Semifowler a 30° para ventilación óptima.</span>
          </div>
        </div>
      </div>

      {/* Botón de Asistencia en Cama (Timbre de Enfermería) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
            <Bell className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">¿Necesitas asistencia o sientes alguna molestia?</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Presiona para alertar a la Estación de Enfermería de la sala post-urgencias.
            </p>
          </div>
        </div>

        <div>
          {nurseCallSent ? (
            <div className="px-5 py-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ¡Llamada recibida! Un enfermero(a) acudirá a tu cama.
            </div>
          ) : (
            <button
              onClick={handleCallNurse}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Bell className="w-4 h-4" />
              Llamar a Enfermería
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CRONOGRAMA DE MEDICAMENTOS (SIN CONFIRMACIÓN MANUAL) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-teal-800" />
              <h3 className="text-sm font-bold text-slate-900">Mis Medicamentos Asignados</h3>
            </div>
            <span className="text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
              Suministro por Enfermería
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Fármacos prescritos por tu médico tratante. La enfermería se encarga de administrarlos directamente en tu horario (<strong>no requieres confirmar manualmente las tomas</strong>).
          </p>

          {activePrescriptions.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
              No tienes medicamentos pendientes de administración en este momento.
            </div>
          ) : (
            <div className="space-y-3">
              {activePrescriptions.map(med => (
                <div
                  key={med.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {med.medicamento.nombre_comercial}
                      </h4>
                      <span className="text-[11px] text-slate-600 font-mono">
                        {med.medicamento.principio_activo} · {med.posologia_formato}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-teal-100 text-teal-800 shrink-0">
                      {med.dosis_administradas} de {med.dosis_totales} dosis
                    </span>
                  </div>

                  {med.indicaciones_especiales && (
                    <p className="text-[11px] text-slate-500 italic bg-white p-2 rounded border border-slate-100">
                      Indicación: {med.indicaciones_especiales}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CALENDARIO DE SOLO LECTURA: ESTANCIA, MEDICACIÓN Y TERAPIAS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-teal-800" />
              <h3 className="text-sm font-bold text-slate-900">Mi Cronograma de Atención</h3>
            </div>
            <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-mono">
              Solo Lectura
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {patientEvents.length === 0 ? (
              <p className="text-slate-400 py-3">No hay actividades programadas próximas.</p>
            ) : (
              patientEvents.map(ev => (
                <div key={ev.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <strong className="text-slate-900 block">{ev.titulo}</strong>
                    <span className="text-[11px] text-slate-500">{ev.descripcion}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-xs font-bold text-teal-800 block">
                      {ev.fecha_inicio.substring(11, 16)} hrs
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {ev.fecha_inicio.substring(8, 10)}/{ev.fecha_inicio.substring(5, 7)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 text-xs flex items-center justify-between text-slate-500">
            <span>Fecha estimada de estancia:</span>
            <strong className="font-mono text-slate-800">{patient.tiempo_estimado_alta}</strong>
          </div>
        </div>

      </div>

    </div>
  );
};
