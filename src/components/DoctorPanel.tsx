import React, { useState, useEffect } from 'react';
import { 
  PatientRecord, 
  VitalSigns, 
  Prescription, 
  Medication, 
  ClinicalLogEvent, 
  AutomataState,
  AlertLevel 
} from '../types/hospital';
import { AutomataDiagram } from './AutomataDiagram';
import { validateDischargeGuards, validatePosologyFormat } from '../utils/automataEngine';
import { 
  HeartPulse, 
  Pill, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Lock, 
  Plus, 
  Volume2,
  BellRing
} from 'lucide-react';

interface DoctorPanelProps {
  patients: PatientRecord[];
  selectedPatientId: number;
  onSelectPatient: (patientId: number) => void;
  vitalsHistory: VitalSigns[];
  prescriptions: Prescription[];
  catalogMedications: Medication[];
  logs: ClinicalLogEvent[];
  onAddVitals: (vitals: Omit<VitalSigns, 'id' | 'fecha_toma'>) => void;
  onAddPrescription: (
    prescription: Omit<Prescription, 'id' | 'fecha_prescripcion' | 'dosis_administradas' | 'dosis_pendientes' | 'estado' | 'medico_nombre'>
  ) => { success: boolean; error?: string };
  onAdministerDose: (prescriptionId: number) => void;
  onTransitionAutomata: (patientId: number, targetState: AutomataState, eventLabel: string) => void;
}

export const DoctorPanel: React.FC<DoctorPanelProps> = ({
  patients,
  selectedPatientId,
  onSelectPatient,
  vitalsHistory,
  prescriptions,
  catalogMedications,
  logs,
  onAddVitals,
  onAddPrescription,
  onAdministerDose,
  onTransitionAutomata
}) => {
  const currentPatient = patients.find(p => p.id === selectedPatientId) || patients[0];

  const patientVitals = vitalsHistory
    .filter(v => v.paciente_id === currentPatient.id)
    .sort((a, b) => b.id - a.id);
  const latestVitals = patientVitals[0];

  const patientPrescriptions = prescriptions.filter(p => p.paciente_id === currentPatient.id);
  const patientLogs = logs.filter(l => l.paciente_id === currentPatient.id);

  // Validación de guardas estrictas para egreso clínico
  const dischargeGuard = validateDischargeGuards(currentPatient, latestVitals, prescriptions);

  // Estados del formulario de signos vitales
  const [pas, setPas] = useState(latestVitals ? latestVitals.presion_sistolica : 120);
  const [pad, setPad] = useState(latestVitals ? latestVitals.presion_diastolica : 80);
  const [fc, setFc] = useState(latestVitals ? latestVitals.frecuencia_cardiaca : 75);
  const [fr, setFr] = useState(latestVitals ? latestVitals.frecuencia_respiratoria : 16);
  const [temp, setTemp] = useState(latestVitals ? latestVitals.temperatura : 36.6);
  const [spo2, setSpo2] = useState(latestVitals ? latestVitals.saturacion_oxigeno : 98);
  const [eva, setEva] = useState(latestVitals ? latestVitals.nivel_dolor_eva : 1);
  const [clinicalNotes, setClinicalNotes] = useState('');

  // Formulario de prescripción farmacológica
  const [selectedMedId, setSelectedMedId] = useState<number>(catalogMedications[0]?.id || 1);
  const [posologyInput, setPosologyInput] = useState('1 g | c/ 12 hrs | 3 días');
  const [dosisTotales, setDosisTotales] = useState(6);
  const [specialInstructions, setSpecialInstructions] = useState('Diluir en 100 ml Solución Fisiológica a pasar en 30 min.');
  const [prescriptionFeedback, setPrescriptionFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  // Modal interactivo de advertencia cuando intenta forzar el alta q5 sin cumplir requisitos
  const [showDischargeWarningModal, setShowDischargeWarningModal] = useState(false);

  // Feedback sonoro/visual para estado q4
  const [alertChimeActive, setAlertChimeActive] = useState(false);

  useEffect(() => {
    if (currentPatient.estado_automata === 'q4') {
      setAlertChimeActive(true);
      // Generar audio beep utilizando Web Audio API estándar
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880 Hz A5
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } catch {
        // audio no soportado o silenciado
      }
    } else {
      setAlertChimeActive(false);
    }
  }, [currentPatient.estado_automata, currentPatient.id]);

  const posologyValidation = validatePosologyFormat(posologyInput);

  const calculateAlertLevel = (
    pasVal: number,
    fcVal: number,
    tempVal: number,
    spo2Val: number,
    evaVal: number
  ): AlertLevel => {
    if (spo2Val < 90 || fcVal > 130 || fcVal < 45 || tempVal >= 39.0 || pasVal >= 180 || pasVal < 85) {
      return 'ALERTA_CRITICA';
    }
    if (spo2Val < 94 || fcVal > 105 || fcVal < 55 || tempVal >= 38.0 || pasVal >= 145 || evaVal >= 6) {
      return 'ALERTA_MODERADA';
    }
    return 'NORMAL';
  };

  const currentFormAlert = calculateAlertLevel(pas, fc, temp, spo2, eva);

  const handleSaveVitals = (e: React.FormEvent) => {
    e.preventDefault();
    onAddVitals({
      paciente_id: currentPatient.id,
      medico_id: 2,
      presion_sistolica: pas,
      presion_diastolica: pad,
      frecuencia_cardiaca: fc,
      frecuencia_respiratoria: fr,
      temperatura: temp,
      saturacion_oxigeno: spo2,
      nivel_dolor_eva: eva,
      estado_alerta: currentFormAlert,
      comentarios_clinicos: clinicalNotes || 'Control de signos vitales en ronda de post-urgencias.'
    });

    // Si los signos registran alerta, pasar automáticamente a q4
    if (currentFormAlert !== 'NORMAL') {
      onTransitionAutomata(currentPatient.id, 'q4', 'ALERTA_SIGNOS_VITALES');
    } else if (currentPatient.estado_automata === 'q4') {
      // Si se normalizan los signos y no hay alerta, volver a observación q2
      onTransitionAutomata(currentPatient.id, 'q2', 'NORMALIZACION_SIGNOS');
    }

    setClinicalNotes('');
  };

  const handlePrescribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!posologyValidation.isValid) {
      setPrescriptionFeedback({ text: posologyValidation.message, isError: true });
      return;
    }

    const selectedMed = catalogMedications.find(m => m.id === Number(selectedMedId));
    if (!selectedMed) return;

    const res = onAddPrescription({
      paciente_id: currentPatient.id,
      medico_id: 2,
      medicamento_id: selectedMed.id,
      medicamento: selectedMed,
      posologia_formato: posologyInput.trim(),
      dosis_totales: Number(dosisTotales),
      indicaciones_especiales: specialInstructions
    });

    if (res.success) {
      setPrescriptionFeedback({ text: 'Prescripción emitida y descontada del inventario de farmacia.', isError: false });
      // Al prescribir, activar estado q3 (Edición de Bitácora y Medicación)
      onTransitionAutomata(currentPatient.id, 'q3', 'PRESCRIPCION_FARMACOS');
    } else {
      setPrescriptionFeedback({ text: res.error || 'Error al emitir prescripción.', isError: true });
    }
  };

  const handleAttemptDischarge = (targetState: AutomataState, eventLabel: string) => {
    if (targetState === 'q5') {
      if (!dischargeGuard.canDischarge) {
        // Desplegar advertencia interactiva que impide la acción
        setShowDischargeWarningModal(true);
        return;
      }
    }
    onTransitionAutomata(currentPatient.id, targetState, eventLabel);
  };

  return (
    <div className="space-y-6">
      
      {/* ALERTA VISUAL Y SONORA EN PANTALLA CUANDO ESTÁ EN q4 */}
      {currentPatient.estado_automata === 'q4' && (
        <div className="p-4 bg-red-600 text-white rounded-xl shadow-lg flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <BellRing className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="text-sm font-black tracking-wide uppercase">
                [q4] Alerta Activa de Dosis o Signos Críticos en {currentPatient.numero_cama}
              </h4>
              <p className="text-xs text-red-100 mt-0.5">
                El paciente presenta signos vitales en rango de riesgo o dosis desfasadas. Vigilancia prioritaria activada.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onTransitionAutomata(currentPatient.id, 'q2', 'ALERTA_ATENDIDA')}
              className="px-3 py-1.5 bg-white text-red-700 hover:bg-red-50 text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              Atender Alerta y Pasar a [q2]
            </button>
          </div>
        </div>
      )}

      {/* SELECTOR RÁPIDO DE PACIENTES POR CAMILLA */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Paciente en Observación:
            </span>
            <div className="relative">
              <select
                value={currentPatient.id}
                onChange={(e) => onSelectPatient(Number(e.target.value))}
                className="text-sm font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-700 cursor-pointer"
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    [{p.numero_cama}] {p.nombre_completo} — [{p.estado_automata}] {p.diagnostico_ingreso.substring(0, 30)}...
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Cama:</span>
              <strong className="font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                {currentPatient.numero_cama}
              </strong>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">RUT:</span>
              <span className="font-mono text-slate-700">{currentPatient.rut_dni}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Grupo:</span>
              <strong className="text-slate-900">{currentPatient.grupo_sanguineo}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-red-600 font-medium">Alergias:</span>
              <span className="text-red-700 font-semibold">{currentPatient.alergias}</span>
            </div>
          </div>
        </div>
      </div>

      {/* FLUJO DEL AUTÓMATA DE 6 ESTADOS (q0 a q5) */}
      <AutomataDiagram
        currentState={currentPatient.estado_automata}
        onTransition={handleAttemptDischarge}
        isDoctorView={true}
        canDischarge={dischargeGuard.canDischarge}
        dischargeBlockers={dischargeGuard.blockers}
        patientBed={currentPatient.numero_cama}
      />

      {/* Grid: Signos Vitales y Prescripciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* PANEL DE SIGNOS VITALES */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-red-600" />
                Monitoreo Paramétrico de Signos Vitales
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Valores de telemetría y evolución clínica en sala post-urgencias.
              </p>
            </div>

            {latestVitals && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded border ${
                latestVitals.estado_alerta === 'NORMAL'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : latestVitals.estado_alerta === 'ALERTA_MODERADA'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}>
                {latestVitals.estado_alerta.replace('_', ' ')}
              </span>
            )}
          </div>

          {/* Últimos valores tomados */}
          {latestVitals && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-500 uppercase block">P. Arterial</span>
                <span className="font-mono text-xs font-bold text-slate-900">
                  {latestVitals.presion_sistolica}/{latestVitals.presion_diastolica}
                </span>
                <span className="text-[9px] text-slate-400 block">mmHg</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-500 uppercase block">Frec. Card.</span>
                <span className={`font-mono text-xs font-bold ${
                  latestVitals.frecuencia_cardiaca > 100 ? 'text-red-600' : 'text-slate-900'
                }`}>
                  {latestVitals.frecuencia_cardiaca}
                </span>
                <span className="text-[9px] text-slate-400 block">lpm</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-500 uppercase block">SpO2</span>
                <span className={`font-mono text-xs font-bold ${
                  latestVitals.saturacion_oxigeno < 94 ? 'text-red-600' : 'text-emerald-700'
                }`}>
                  {latestVitals.saturacion_oxigeno}%
                </span>
                <span className="text-[9px] text-slate-400 block">O2</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-500 uppercase block">Frec. Resp.</span>
                <span className="font-mono text-xs font-bold text-slate-900">
                  {latestVitals.frecuencia_respiratoria}
                </span>
                <span className="text-[9px] text-slate-400 block">rpm</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-500 uppercase block">Temp</span>
                <span className={`font-mono text-xs font-bold ${
                  latestVitals.temperatura >= 38 ? 'text-red-600' : 'text-slate-900'
                }`}>
                  {latestVitals.temperatura}°C
                </span>
                <span className="text-[9px] text-slate-400 block">Axilar</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-500 uppercase block">Dolor EVA</span>
                <span className="font-mono text-xs font-bold text-slate-900">
                  {latestVitals.nivel_dolor_eva}/10
                </span>
                <span className="text-[9px] text-slate-400 block">Escala</span>
              </div>
            </div>
          )}

          {/* Formulario para registrar nuevos signos */}
          <form onSubmit={handleSaveVitals} className="space-y-3 pt-2 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="text-slate-600 font-medium block mb-0.5">Sistólica (mmHg):</label>
                <input
                  type="number"
                  value={pas}
                  onChange={(e) => setPas(Number(e.target.value))}
                  className="w-full font-mono px-2 py-1 rounded border border-slate-200"
                  required
                />
              </div>
              <div>
                <label className="text-slate-600 font-medium block mb-0.5">Diastólica (mmHg):</label>
                <input
                  type="number"
                  value={pad}
                  onChange={(e) => setPad(Number(e.target.value))}
                  className="w-full font-mono px-2 py-1 rounded border border-slate-200"
                  required
                />
              </div>
              <div>
                <label className="text-slate-600 font-medium block mb-0.5">FC (lpm):</label>
                <input
                  type="number"
                  value={fc}
                  onChange={(e) => setFc(Number(e.target.value))}
                  className="w-full font-mono px-2 py-1 rounded border border-slate-200"
                  required
                />
              </div>
              <div>
                <label className="text-slate-600 font-medium block mb-0.5">FR (rpm):</label>
                <input
                  type="number"
                  value={fr}
                  onChange={(e) => setFr(Number(e.target.value))}
                  className="w-full font-mono px-2 py-1 rounded border border-slate-200"
                  required
                />
              </div>
              <div>
                <label className="text-slate-600 font-medium block mb-0.5">Temp (°C):</label>
                <input
                  type="number"
                  step="0.1"
                  value={temp}
                  onChange={(e) => setTemp(Number(e.target.value))}
                  className="w-full font-mono px-2 py-1 rounded border border-slate-200"
                  required
                />
              </div>
              <div>
                <label className="text-slate-600 font-medium block mb-0.5">SpO2 (%):</label>
                <input
                  type="number"
                  value={spo2}
                  onChange={(e) => setSpo2(Number(e.target.value))}
                  className="w-full font-mono px-2 py-1 rounded border border-slate-200"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="text-slate-600 font-medium block mb-0.5">Dolor EVA (0 a 10): {eva}</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={eva}
                  onChange={(e) => setEva(Number(e.target.value))}
                  className="w-full accent-teal-800"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-600 font-medium block mb-0.5">Comentarios de Evolución Clínica:</label>
              <textarea
                rows={2}
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Auscultación pulmonar, murmullo vesicular, tolerancia oral..."
                className="w-full px-2.5 py-1.5 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-700"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className={`text-[11px] font-medium ${
                currentFormAlert === 'NORMAL' ? 'text-emerald-700' : 'text-red-600'
              }`}>
                Estado resultante: <strong>{currentFormAlert}</strong>
              </span>

              <button
                type="submit"
                className="px-3.5 py-1.5 font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Registrar Signos en Bitácora
              </button>
            </div>
          </form>
        </div>

        {/* PANEL DE PRESCRIPCIÓN MÉDICA */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Pill className="w-4 h-4 text-teal-800" />
                Módulo de Prescripción Farmacológica
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Norma Clínica Estandarizada: <code>Dosis | c/ Frecuencia hrs | Duración días</code>
              </p>
            </div>
            <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
              Descuento directo de stock
            </span>
          </div>

          <form onSubmit={handlePrescribe} className="space-y-3 text-xs">
            <div>
              <label className="text-slate-700 font-medium block mb-1">Medicamento:</label>
              <select
                value={selectedMedId}
                onChange={(e) => setSelectedMedId(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
              >
                {catalogMedications.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.nombre_comercial} ({m.principio_activo} · {m.presentacion})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-700 font-medium">Posología (Norma Estandarizada):</label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setPosologyInput('1 g | c/ 12 hrs | 3 días')}
                    className="text-[10px] text-teal-800 hover:underline cursor-pointer"
                  >
                    1g c/12h 3d
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={() => setPosologyInput('500 mg | c/ 8 hrs | 2 días')}
                    className="text-[10px] text-teal-800 hover:underline cursor-pointer"
                  >
                    500mg c/8h 2d
                  </button>
                </div>
              </div>

              <input
                type="text"
                value={posologyInput}
                onChange={(e) => setPosologyInput(e.target.value)}
                placeholder="Ej: 1 g | c/ 12 hrs | 3 días"
                className={`w-full font-mono px-3 py-1.5 rounded-lg border transition-colors ${
                  posologyValidation.isValid
                    ? 'border-emerald-500 focus:ring-emerald-500'
                    : 'border-red-400 focus:ring-red-400'
                }`}
                required
              />

              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className={posologyValidation.isValid ? 'text-emerald-700' : 'text-red-600'}>
                  {posologyValidation.message}
                </span>
                <span className="text-slate-400 text-[10px]">
                  Norma clínica: [Dosis] | c/ [Horas] hrs | [Días] días
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-700 font-medium block mb-1">Dosis Totales a Reservar:</label>
                <input
                  type="number"
                  min="1"
                  max="40"
                  value={dosisTotales}
                  onChange={(e) => setDosisTotales(Number(e.target.value))}
                  className="w-full font-mono px-2 py-1.5 rounded-lg border border-slate-200"
                  required
                />
              </div>
              <div>
                <label className="text-slate-700 font-medium block mb-1">Instrucciones de Administración:</label>
                <input
                  type="text"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Vía EV lenta, diluido..."
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200"
                />
              </div>
            </div>

            {prescriptionFeedback && (
              <div className={`p-2 rounded-lg text-xs ${
                prescriptionFeedback.isError
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}>
                {prescriptionFeedback.text}
              </div>
            )}

            <button
              type="submit"
              disabled={!posologyValidation.isValid}
              className={`w-full py-2 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                posologyValidation.isValid
                  ? 'bg-teal-800 hover:bg-teal-900 text-white cursor-pointer shadow-xs'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Emitir Prescripción y Reservar Medicamento
            </button>
          </form>

          {/* Listado de Prescripciones Activas */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Medicamentos en Pauta Activa:
            </h4>

            {patientPrescriptions.length === 0 ? (
              <p className="text-xs text-slate-400">Sin medicamentos prescritos actualmente.</p>
            ) : (
              <div className="space-y-2">
                {patientPrescriptions.map(p => (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <strong className="text-slate-900 block">{p.medicamento.nombre_comercial}</strong>
                      <span className="font-mono text-slate-600 text-[11px]">{p.posologia_formato}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                        p.dosis_pendientes > 0
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {p.dosis_pendientes > 0 ? `${p.dosis_pendientes} dosis pendientes` : 'Completado'}
                      </span>

                      {/* Botón para administrar dosis y probar guardas */}
                      {p.dosis_pendientes > 0 && (
                        <button
                          onClick={() => onAdministerDose(p.id)}
                          className="px-2 py-0.5 text-[10px] font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors cursor-pointer"
                          title="Simular administración de 1 dosis para completar la pauta"
                        >
                          Suministrar Dosis
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* BITÁCORA CLÍNICA */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-slate-600" />
          Bitácora de Eventos y Evolución Médica
        </h3>

        {patientLogs.length === 0 ? (
          <p className="text-xs text-slate-400">Sin registros históricos previos.</p>
        ) : (
          <div className="space-y-2.5">
            {patientLogs.map(log => (
              <div 
                key={log.id} 
                className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-wrap items-start justify-between gap-2 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 text-[10px]">
                      {log.accion_evento}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      [{log.estado_previo}] → <strong>[{log.estado_nuevo}]</strong>
                    </span>
                    <span className="text-slate-400 text-[11px]">· Por: {log.medico_nombre}</span>
                  </div>
                  <p className="text-slate-700 text-xs">{log.observaciones}</p>
                </div>

                <span className="font-mono text-slate-400 text-[11px] shrink-0">
                  {log.fecha_registro}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL INTERACTIVO DE ADVERTENCIA CUANDO EL MÉDICO INTENTA FORZAR ALTA q5 */}
      {showDischargeWarningModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 bg-red-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Alta Médica Bloqueada [q5]
                </h3>
                <p className="text-xs text-red-700">
                  No se cumplen los requisitos clínicos de seguridad hospitalaria.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs space-y-2 text-red-900">
              <span className="font-bold block">
                Criterios que impiden el paso al estado [q5]:
              </span>
              <ul className="list-disc list-inside space-y-1">
                {dischargeGuard.blockers.map((b, idx) => (
                  <li key={idx}>{b}</li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-slate-600">
              Para formalizar el alta médica, asegúrese de completar las dosis pendientes con el equipo de enfermería y registrar signos vitales dentro de rangos normales.
            </p>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowDischargeWarningModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Comprendido, mantener en observación
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
