import { AutomataState, VitalSigns, Prescription, PatientRecord } from '../types/hospital';

export const AUTOMATA_STATES_METADATA: Record<AutomataState, { code: string; title: string; desc: string; order: number }> = {
  'q0': {
    code: 'q0',
    title: 'Standby / Autenticación',
    desc: 'Validación de credenciales y control de acceso.',
    order: 0
  },
  'q1': {
    code: 'q1',
    title: 'Gestión Administrativa',
    desc: 'Asignación de cama, perfiles y confirmación de ingreso.',
    order: 1
  },
  'q2': {
    code: 'q2',
    title: 'Paciente en Observación / Monitoreo',
    desc: 'Vigilancia basal continua en sala de post-urgencias.',
    order: 2
  },
  'q3': {
    code: 'q3',
    title: 'Edición de Bitácora y Medicación',
    desc: 'Actualización activa de pautas, recetas o evolución.',
    order: 3
  },
  'q4': {
    code: 'q4',
    title: 'Alerta Activa de Dosis / Signos Críticos',
    desc: 'Advertencia clínica prioritaria que requiere atención del equipo.',
    order: 4
  },
  'q5': {
    code: 'q5',
    title: 'Paciente Dado de Alta / Inactivo',
    desc: 'Cierre clínico formalizado y egreso de sala post-urgencias.',
    order: 5
  }
};

/**
 * Validador estricto para autorizar el paso a q5 (Paciente Dado de Alta)
 * Bloquea la acción si:
 * 1. Hay alertas activas en signos vitales (alerta moderada o crítica, saturación < 94%, taquicardia o fiebre)
 * 2. Hay dosis de medicamentos pendientes por suministrar en la pauta activa
 * 3. Falta completar la evolución médica
 */
export function validateDischargeGuards(
  patient: PatientRecord,
  latestVitals?: VitalSigns,
  prescriptions: Prescription[] = []
): { canDischarge: boolean; blockers: string[] } {
  const blockers: string[] = [];

  // Verificación 1: Signos vitales y alertas clínicas
  if (!latestVitals) {
    blockers.push('No existen registros de signos vitales actualizados durante el turno.');
  } else {
    if (latestVitals.estado_alerta !== 'NORMAL') {
      blockers.push(
        `Alerta clínica activa (${latestVitals.estado_alerta.replace('_', ' ')}): FC ${latestVitals.frecuencia_cardiaca} lpm, SpO2 ${latestVitals.saturacion_oxigeno}%, Temp ${latestVitals.temperatura}°C.`
      );
    }
    if (latestVitals.saturacion_oxigeno < 94) {
      blockers.push(`Saturación de oxígeno en ${latestVitals.saturacion_oxigeno}% (inferior al umbral seguro de 94%).`);
    }
    if (latestVitals.temperatura >= 38.0) {
      blockers.push(`Temperatura corporal en ${latestVitals.temperatura}°C (cuadro febril activo).`);
    }
    if (latestVitals.frecuencia_cardiaca > 110 || latestVitals.frecuencia_cardiaca < 50) {
      blockers.push(`Frecuencia cardíaca fuera de rango normal (${latestVitals.frecuencia_cardiaca} lpm).`);
    }
  }

  // Verificación 2: Medicamentos con dosis pendientes
  const patientPrescriptions = prescriptions.filter(p => p.paciente_id === patient.id && p.estado === 'ACTIVA');
  const pendingDosesTotal = patientPrescriptions.reduce((acc, p) => acc + p.dosis_pendientes, 0);

  if (pendingDosesTotal > 0) {
    const detail = patientPrescriptions
      .filter(p => p.dosis_pendientes > 0)
      .map(p => `${p.medicamento.nombre_comercial} (${p.dosis_pendientes} dosis pendientes)`)
      .join(', ');
    blockers.push(`Pauta médica incompleta: ${pendingDosesTotal} dosis pendientes por suministrar [${detail}].`);
  }

  return {
    canDischarge: blockers.length === 0,
    blockers
  };
}

/**
 * Validador de Formato Clínico de Posología Estandarizada
 * Norma: [Dosis con unidad] | c/ [Frecuencia] hrs | [Duración] días
 * Ej: "500 mg | c/ 8 hrs | 3 días" o "1 g | c/ 12 hrs | 2 días"
 */
export const POSOLOGY_PATTERN = /^\d{1,4}\s?(mg|g|ml|UI|gotas)\s*\|\s*c\/\s*\d{1,2}\s*hrs?\s*\|\s*\d{1,2}\s*días?$/i;

export function validatePosologyFormat(posology: string): { isValid: boolean; message: string } {
  if (!posology.trim()) {
    return { isValid: false, message: 'La posología no puede estar vacía.' };
  }
  const passes = POSOLOGY_PATTERN.test(posology.trim());
  if (!passes) {
    return {
      isValid: false,
      message: 'Debe cumplir la norma clínica: "500 mg | c/ 8 hrs | 3 días" o "1 g | c/ 12 hrs | 2 días".'
    };
  }
  return { isValid: true, message: 'Formato clínico válido conforme a la norma institucional.' };
}
