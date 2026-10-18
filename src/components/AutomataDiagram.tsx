import React from 'react';
import { AutomataState } from '../types/hospital';
import { AUTOMATA_STATES_METADATA } from '../utils/automataEngine';
import { CheckCircle2, AlertTriangle, Lock, ShieldCheck, ArrowRight } from 'lucide-react';

interface AutomataDiagramProps {
  currentState: AutomataState;
  onTransition?: (targetState: AutomataState, eventLabel: string) => void;
  isDoctorView?: boolean;
  canDischarge?: boolean;
  dischargeBlockers?: string[];
  patientBed: string;
}

export const AutomataDiagram: React.FC<AutomataDiagramProps> = ({
  currentState,
  onTransition,
  isDoctorView = false,
  canDischarge = true,
  dischargeBlockers = [],
  patientBed
}) => {
  const sequence: AutomataState[] = ['q0', 'q1', 'q2', 'q3', 'q4', 'q5'];
  const currentMeta = AUTOMATA_STATES_METADATA[currentState] || AUTOMATA_STATES_METADATA['q2'];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
      
      {/* TARJETA DESTACADA CON EL CÓDIGO DEL ESTADO ACTUAL (q0 a q5) */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            Control de Estados Clínicos del Paciente
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Secuencia formal de atención en post-urgencias ({patientBed}).
          </p>
        </div>

        {/* Recuadro de Estado Actual en q0-q5 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Estado del Paciente:</span>
          <div className={`px-3 py-1.5 rounded-lg border font-mono flex items-center gap-2 shadow-xs ${
            currentState === 'q4'
              ? 'bg-red-50 text-red-700 border-red-300 ring-2 ring-red-400 animate-pulse'
              : currentState === 'q5'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-teal-900 text-teal-100 border-teal-950'
          }`}>
            <span className="text-sm font-black tracking-wider">[{currentMeta.code}]</span>
            <span className="text-xs font-semibold">{currentMeta.title}</span>
          </div>
        </div>
      </div>

      {/* Grid de los 6 Estados (q0 a q5) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {sequence.map((stateKey) => {
          const meta = AUTOMATA_STATES_METADATA[stateKey];
          const isCurrent = currentState === stateKey;
          const isAlert = stateKey === 'q4';
          const isDone = stateKey === 'q5';

          return (
            <div
              key={stateKey}
              className={`p-3 rounded-lg border text-left transition-all relative ${
                isCurrent
                  ? isAlert
                    ? 'bg-red-600 text-white border-red-700 shadow-md ring-2 ring-red-400'
                    : isDone
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-md ring-2 ring-emerald-400'
                    : 'bg-teal-900 text-white border-teal-950 shadow-md ring-2 ring-teal-600/30'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100/70'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-mono font-black ${
                  isCurrent ? 'text-teal-200' : 'text-slate-500'
                }`}>
                  {meta.code}
                </span>
                {isCurrent && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                )}
              </div>

              <div className="text-xs font-bold leading-tight line-clamp-1">
                {meta.title}
              </div>
              <div className={`text-[11px] leading-snug mt-1 line-clamp-2 ${
                isCurrent ? 'text-teal-100' : 'text-slate-500'
              }`}>
                {meta.desc}
              </div>
            </div>
          );
        })}
      </div>

      {/* Botones de selección manual / transiciones para el Médico */}
      {isDoctorView && onTransition && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-700">
              Selección de Estado del Paciente:
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onTransition('q2', 'VIGILANCIA_BASAL')}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  currentState === 'q2'
                    ? 'bg-teal-900 text-white border-teal-950 font-bold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
                title="Pasar a Observación y Monitoreo"
              >
                [q2] Observación
              </button>

              <button
                onClick={() => onTransition('q3', 'EDITAR_MEDICACION')}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  currentState === 'q3'
                    ? 'bg-teal-900 text-white border-teal-950 font-bold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
                title="Pasar a Edición de Bitácora y Medicación"
              >
                [q3] Bitácora & Medicación
              </button>

              <button
                onClick={() => onTransition('q4', 'ACTIVAR_ALERTA')}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  currentState === 'q4'
                    ? 'bg-red-600 text-white border-red-700 font-bold'
                    : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                }`}
                title="Registrar Alerta Activa de Dosis o Signos Críticos"
              >
                [q4] Alerta Activa
              </button>

              {/* Botón de Alta Médica (q5) con bloqueo estricto */}
              <button
                onClick={() => onTransition('q5', 'ALTA_MEDICA_COMPLETA')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  canDischarge
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                    : 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                }`}
                title={canDischarge ? 'Emitir y firmar Alta Médica [q5]' : 'Ver requisitos pendientes para Alta Médica'}
              >
                {!canDischarge && <Lock className="w-3.5 h-3.5 text-amber-800" />}
                <span>[q5] Emitir Alta Médica</span>
              </button>
            </div>
          </div>

          {/* Advertencia interactiva explicativa si no cumple requisitos para q5 */}
          {!canDischarge && dischargeBlockers.length > 0 && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Condición Estricta: Prohibido emitir Alta Médica [q5]</span>
              </div>
              <p className="text-amber-800 text-[11px]">
                El sistema bloquea el paso al estado <strong>q5</strong> debido a criterios clínicos no satisfechos:
              </p>
              <ul className="list-disc list-inside text-amber-800 space-y-0.5 text-[11px] pt-1">
                {dischargeBlockers.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
