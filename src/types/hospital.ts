/**
 * HospitaLogix - Tipos e Interfaces de Dominio Clínico
 */

export type RoleId = 1 | 2 | 3; // 1: Admin, 2: Medico, 3: Paciente

export interface Role {
  id: RoleId;
  nombre: 'Administrador' | 'Médico' | 'Paciente';
  descripcion: string;
}

export interface User {
  id: number;
  rol_id: RoleId;
  nombre_completo: string;
  email: string;
  password?: string;
  rut_dni: string;
  telefono: string;
  activo: boolean;
  avatar?: string;
  especialidad?: string;
  numero_colegiado?: string;
  cargo?: string;
}

/**
 * Autómata de 6 Estados Formales (q0 a q5)
 * q0: Standby / Autenticación
 * q1: Gestión Administrativa
 * q2: Paciente en Observación / Monitoreo
 * q3: Edición de Bitácora y Medicación
 * q4: Alerta Activa de Dosis / Signos Críticos
 * q5: Paciente Dado de Alta / Inactivo
 */
export type AutomataState = 'q0' | 'q1' | 'q2' | 'q3' | 'q4' | 'q5';

export type AlertLevel = 'NORMAL' | 'ALERTA_MODERADA' | 'ALERTA_CRITICA';

export interface VitalSigns {
  id: number;
  paciente_id: number;
  medico_id: number;
  presion_sistolica: number;
  presion_diastolica: number;
  frecuencia_cardiaca: number;
  frecuencia_respiratoria: number;
  temperatura: number;
  saturacion_oxigeno: number;
  nivel_dolor_eva: number; // 0 a 10
  estado_alerta: AlertLevel;
  comentarios_clinicos: string;
  fecha_toma: string;
}

export interface Medication {
  id: number;
  codigo: string;
  nombre_comercial: string;
  principio_activo: string;
  presentacion: string;
  stock_minimo: number;
}

export interface InventoryItem {
  id: number;
  medicamento_id: number;
  medicamento: Medication;
  lote: string;
  stock_actual: number;
  cantidad_deseada: number;
  cantidad_utilizada: number;
  fecha_vencimiento: string;
  ubicacion_almacen: string;
}

export interface Prescription {
  id: number;
  paciente_id: number;
  medico_id: number;
  medico_nombre: string;
  medicamento_id: number;
  medicamento: Medication;
  posologia_formato: string; // Formato institucional
  dosis_totales: number;
  dosis_administradas: number;
  dosis_pendientes: number;
  indicaciones_especiales: string;
  estado: 'ACTIVA' | 'SUSPENDIDA' | 'FINALIZADA';
  fecha_prescripcion: string;
}

export interface PatientRecord {
  id: number;
  usuario_id: number;
  nombre_completo: string;
  rut_dni: string;
  numero_cama: string;
  diagnostico_ingreso: string;
  fecha_ingreso: string;
  grupo_sanguineo: string;
  alergias: string;
  estado_automata: AutomataState;
  medico_asignado_id: number;
  medico_asignado_nombre: string;
  tiempo_estimado_alta: string;
  recomendaciones_medicas?: string;
  signos_actuales?: VitalSigns;
}

export interface ClinicalLogEvent {
  id: number;
  paciente_id: number;
  medico_id: number;
  medico_nombre: string;
  estado_previo: AutomataState;
  estado_nuevo: AutomataState;
  accion_evento: string;
  observaciones: string;
  signos_resumen?: string;
  fecha_registro: string;
}

export interface DischargeRequest {
  id: number;
  paciente_id: number;
  paciente_nombre: string;
  numero_cama: string;
  diagnostico: string;
  medico_solicitante_id: number;
  medico_solicitante_nombre: string;
  admin_aprobador_id?: number;
  resumen_clinico: string;
  criterios_cumplidos: string[];
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  motivo_rechazo?: string;
  fecha_solicitud: string;
  fecha_resolucion?: string;
}

export type EventType = 
  | 'RONDA_MEDICA' 
  | 'TERAPIA_KINESIOLOGIA' 
  | 'ADMINISTRACION_ENDOMED' 
  | 'CURACION' 
  | 'CONTROL_POST_ALTA';

export type EventStatus = 'PROGRAMADA' | 'EN_CURSO' | 'COMPLETADA' | 'CANCELADA' | 'REASIGNADA';

export interface AgendaEvent {
  id: number;
  paciente_id: number;
  paciente_nombre: string;
  numero_cama: string;
  medico_id: number;
  medico_nombre: string;
  tipo_evento: EventType;
  titulo: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: EventStatus;
  motivo_cancelacion?: string;
  medico_original_nombre?: string;
}

/**
 * Modelo Formal de la Máquina de Mealy para Autenticación
 * M = (S, s0, Σ, Λ, T, G)
 * S: Estados { STANDBY, VALIDANDO_IDENTIDAD, COMPROBANDO_ROL, SESION_AUTORIZADA, ACCESO_DENEGADO }
 * Σ: Entrada (email, password, rol_seleccionado)
 * Λ: Salida (acceso_concedido, mensaje_salida, estado_asignado, usuario_autenticado)
 */
export interface MealyTransition {
  estado_origen: string;
  entrada_descripcion: string;
  estado_destino: string;
  salida_accion: string;
  acceso_concedido: boolean;
}
