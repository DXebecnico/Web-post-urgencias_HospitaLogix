import { 
  User, 
  PatientRecord, 
  Medication, 
  InventoryItem, 
  Prescription, 
  VitalSigns, 
  ClinicalLogEvent, 
  DischargeRequest, 
  AgendaEvent 
} from '../types/hospital';

export const INITIAL_USERS: User[] = [
  {
    id: 1,
    rol_id: 1,
    nombre_completo: 'Dra. Elena Ramos',
    email: 'admin@hospital.local',
    password: 'Admin123!',
    rut_dni: '12.345.678-9',
    telefono: '+56 9 8765 4321',
    activo: true,
    especialidad: 'Dirección Médica y Gestión Asistencial',
    cargo: 'Directora de Sala Post-Urgencias'
  },
  {
    id: 2,
    rol_id: 2,
    nombre_completo: 'Dr. Mateo Morales',
    email: 'dr.morales@hospital.local',
    password: 'Medico123!',
    rut_dni: '15.987.654-3',
    telefono: '+56 9 7654 3210',
    activo: true,
    especialidad: 'Medicina de Urgencias',
    numero_colegiado: 'COLMED-45892',
    cargo: 'Médico Urgenciólogo de Turno'
  },
  {
    id: 3,
    rol_id: 2,
    nombre_completo: 'Dra. Camila Fuentes',
    email: 'dra.fuentes@hospital.local',
    password: 'Medico123!',
    rut_dni: '16.432.109-8',
    telefono: '+56 9 6543 2109',
    activo: true,
    especialidad: 'Medicina Interna',
    numero_colegiado: 'COLMED-51204',
    cargo: 'Médico Especialista en Post-Urgencias'
  },
  {
    id: 4,
    rol_id: 3,
    nombre_completo: 'Lucía Vargas Soto',
    email: 'lucia.vargas@paciente.local',
    password: 'Paciente123!',
    rut_dni: '19.876.543-2',
    telefono: '+56 9 5432 1098',
    activo: true,
  },
  {
    id: 5,
    rol_id: 3,
    nombre_completo: 'Fernando Rojas Morales',
    email: 'fernando.rojas@paciente.local',
    password: 'Paciente123!',
    rut_dni: '14.567.890-1',
    telefono: '+56 9 4321 0987',
    activo: true,
  },
  {
    id: 6,
    rol_id: 3,
    nombre_completo: 'Beatriz Mendoza',
    email: 'beatriz.mendoza@paciente.local',
    password: 'Paciente123!',
    rut_dni: '18.123.456-7',
    telefono: '+56 9 3210 9876',
    activo: true,
  }
];

export const INITIAL_MEDICATIONS: Medication[] = [
  {
    id: 1,
    codigo: 'MED-CEF-1G',
    nombre_comercial: 'Rocephin',
    principio_activo: 'Ceftriaxona',
    presentacion: 'Frasco Ampolla 1 g IV',
    stock_minimo: 15
  },
  {
    id: 2,
    codigo: 'MED-PAR-1G',
    nombre_comercial: 'Paracetamol IV',
    principio_activo: 'Paracetamol',
    presentacion: 'Solución para Perfusión 1 g / 100 ml',
    stock_minimo: 25
  },
  {
    id: 3,
    codigo: 'MED-SAL-100',
    nombre_comercial: 'Salbutamol Inhalador',
    principio_activo: 'Salbutamol Sulfato',
    presentacion: 'Inhalador 100 mcg / dosis (200 dosis)',
    stock_minimo: 10
  },
  {
    id: 4,
    codigo: 'MED-KET-30',
    nombre_comercial: 'Ketorolaco Trometamol',
    principio_activo: 'Ketorolaco',
    presentacion: 'Ampolla 30 mg / 1 ml IM/IV',
    stock_minimo: 20
  },
  {
    id: 5,
    codigo: 'MED-HID-100',
    nombre_comercial: 'Actocortina',
    principio_activo: 'Hidrocortisona',
    presentacion: 'Frasco Ampolla 100 mg liofilizado',
    stock_minimo: 12
  },
  {
    id: 6,
    codigo: 'MED-ENOX-40',
    nombre_comercial: 'Clexane',
    principio_activo: 'Enoxaparina Sódica',
    presentacion: 'Jeringa prellenada 40 mg / 0.4 ml SC',
    stock_minimo: 15
  }
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 1,
    medicamento_id: 1,
    medicamento: INITIAL_MEDICATIONS[0],
    lote: 'LOTE-CF-2026-A',
    stock_actual: 38,
    cantidad_deseada: 50,
    cantidad_utilizada: 12,
    fecha_vencimiento: '2027-11-30',
    ubicacion_almacen: 'Estación Central Post-Urgencias'
  },
  {
    id: 2,
    medicamento_id: 2,
    medicamento: INITIAL_MEDICATIONS[1],
    lote: 'LOTE-PC-2026-C',
    stock_actual: 64,
    cantidad_deseada: 80,
    cantidad_utilizada: 26,
    fecha_vencimiento: '2028-02-15',
    ubicacion_almacen: 'Estación Central Post-Urgencias'
  },
  {
    id: 3,
    medicamento_id: 3,
    medicamento: INITIAL_MEDICATIONS[2],
    lote: 'LOTE-SB-2025-F',
    stock_actual: 8, // Bajo stock (< 10)
    cantidad_deseada: 25,
    cantidad_utilizada: 17,
    fecha_vencimiento: '2026-12-31',
    ubicacion_almacen: 'Gaveta Urgencias Respiratorias'
  },
  {
    id: 4,
    medicamento_id: 4,
    medicamento: INITIAL_MEDICATIONS[3],
    lote: 'LOTE-KT-2026-X',
    stock_actual: 18, // Bajo stock (< 20)
    cantidad_deseada: 40,
    cantidad_utilizada: 22,
    fecha_vencimiento: '2027-08-20',
    ubicacion_almacen: 'Estación Central Post-Urgencias'
  },
  {
    id: 5,
    medicamento_id: 5,
    medicamento: INITIAL_MEDICATIONS[4],
    lote: 'LOTE-HC-2026-M',
    stock_actual: 14,
    cantidad_deseada: 30,
    cantidad_utilizada: 16,
    fecha_vencimiento: '2027-05-10',
    ubicacion_almacen: 'Carro de Reanimación'
  },
  {
    id: 6,
    medicamento_id: 6,
    medicamento: INITIAL_MEDICATIONS[5],
    lote: 'LOTE-EX-2026-Z',
    stock_actual: 29,
    cantidad_deseada: 45,
    cantidad_utilizada: 11,
    fecha_vencimiento: '2027-09-18',
    ubicacion_almacen: 'Refrigerador Clínico 2-8°C'
  }
];

export const INITIAL_VITALS: VitalSigns[] = [
  {
    id: 1,
    paciente_id: 1,
    medico_id: 2,
    presion_sistolica: 122,
    presion_diastolica: 78,
    frecuencia_cardiaca: 84,
    frecuencia_respiratoria: 18,
    temperatura: 36.8,
    saturacion_oxigeno: 97,
    nivel_dolor_eva: 2,
    estado_alerta: 'NORMAL',
    comentarios_clinicos: 'Paciente lúcida, con buena mecánica ventilatoria tras dosis de antibiótico endovenoso.',
    fecha_toma: 'Hace 25 min'
  },
  {
    id: 2,
    paciente_id: 2,
    medico_id: 2,
    presion_sistolica: 118,
    presion_diastolica: 74,
    frecuencia_cardiaca: 72,
    frecuencia_respiratoria: 16,
    temperatura: 36.5,
    saturacion_oxigeno: 99,
    nivel_dolor_eva: 1,
    estado_alerta: 'NORMAL',
    comentarios_clinicos: 'Sin dolor abdominal residual, abdomen blando, diuresis conservada. Apto para cierre clínico.',
    fecha_toma: 'Hace 40 min'
  },
  {
    id: 3,
    paciente_id: 3,
    medico_id: 3,
    presion_sistolica: 135,
    presion_diastolica: 88,
    frecuencia_cardiaca: 104,
    frecuencia_respiratoria: 22,
    temperatura: 37.4,
    saturacion_oxigeno: 94,
    nivel_dolor_eva: 4,
    estado_alerta: 'ALERTA_MODERADA',
    comentarios_clinicos: 'Discreta taquicardia refleja post broncodilatador, sibilancias espiratorias aisladas.',
    fecha_toma: 'Hace 10 min'
  }
];

export const INITIAL_PATIENTS: PatientRecord[] = [
  {
    id: 1,
    usuario_id: 4,
    nombre_completo: 'Lucía Vargas Soto',
    rut_dni: '19.876.543-2',
    numero_cama: 'Cama 04-B',
    diagnostico_ingreso: 'Neumonía adquirida en la comunidad compensada con oxigenoterapia.',
    fecha_ingreso: '17/10/2026 01:20',
    grupo_sanguineo: 'A+',
    alergias: 'Penicilina y derivados',
    estado_automata: 'q3', // Edición de Bitácora y Medicación
    medico_asignado_id: 2,
    medico_asignado_nombre: 'Dr. Mateo Morales',
    tiempo_estimado_alta: '18/10/2026 14:00',
    recomendaciones_medicas: 'Mantener reposo en cama a 30 grados (posición semifowler). Hidratación oral asistida con pequeños sorbos. Ejercicios respiratorios con inspirómetro cada 2 horas. Si presenta tos exigente o dificultad al respirar, solicitar asistencia inmediata a enfermería.',
    signos_actuales: INITIAL_VITALS[0]
  },
  {
    id: 2,
    usuario_id: 5,
    nombre_completo: 'Fernando Rojas Morales',
    rut_dni: '14.567.890-1',
    numero_cama: 'Cama 02-A',
    diagnostico_ingreso: 'Cólico biliar agudo resuelto en observación post-analgesia.',
    fecha_ingreso: '16/10/2026 15:40',
    grupo_sanguineo: 'O+',
    alergias: 'Ninguna conocida',
    estado_automata: 'q2', // Paciente en Observación / Monitoreo
    medico_asignado_id: 2,
    medico_asignado_nombre: 'Dr. Mateo Morales',
    tiempo_estimado_alta: '17/10/2026 21:00',
    recomendaciones_medicas: 'Régimen cero grasas y colecistoquinéticos. Hidratación con suero fisiológico completada. Deambulación asistida permitida dentro de la sala.',
    signos_actuales: INITIAL_VITALS[1]
  },
  {
    id: 3,
    usuario_id: 6,
    nombre_completo: 'Beatriz Mendoza',
    rut_dni: '18.123.456-7',
    numero_cama: 'Cama 06-B',
    diagnostico_ingreso: 'Crisis asmática moderada post-nebulización.',
    fecha_ingreso: '17/10/2026 11:30',
    grupo_sanguineo: 'B+',
    alergias: 'Sulfamidas',
    estado_automata: 'q4', // Alerta Activa de Dosis / Signos Críticos
    medico_asignado_id: 3,
    medico_asignado_nombre: 'Dra. Camila Fuentes',
    tiempo_estimado_alta: '19/10/2026 10:00',
    recomendaciones_medicas: 'Monitoreo estricto de patrón ventilatorio cada 2 horas. Nebulizaciones con solución salina según necesidad. Reposo absoluto en cama.',
    signos_actuales: INITIAL_VITALS[2]
  }
];

export const INITIAL_PRESCRIPTIONS: Prescription[] = [
  {
    id: 1,
    paciente_id: 1,
    medico_id: 2,
    medico_nombre: 'Dr. Mateo Morales',
    medicamento_id: 1,
    medicamento: INITIAL_MEDICATIONS[0],
    posologia_formato: '1 g | c/ 12 hrs | 3 días',
    dosis_totales: 6,
    dosis_administradas: 2,
    dosis_pendientes: 4,
    indicaciones_especiales: 'Diluir en 100 ml de Solución Fisiológica 0.9% a pasar en 30 minutos.',
    estado: 'ACTIVA',
    fecha_prescripcion: '17/10/2026 02:00'
  },
  {
    id: 2,
    paciente_id: 1,
    medico_id: 2,
    medico_nombre: 'Dr. Mateo Morales',
    medicamento_id: 2,
    medicamento: INITIAL_MEDICATIONS[1],
    posologia_formato: '1 g | c/ 8 hrs | 2 días',
    dosis_totales: 6,
    dosis_administradas: 2,
    dosis_pendientes: 4,
    indicaciones_especiales: 'Pasar EV condicional a temperatura > 37.8°C o dolor EVA >= 4.',
    estado: 'ACTIVA',
    fecha_prescripcion: '17/10/2026 02:00'
  },
  {
    id: 3,
    paciente_id: 2,
    medico_id: 2,
    medico_nombre: 'Dr. Mateo Morales',
    medicamento_id: 4,
    medicamento: INITIAL_MEDICATIONS[3],
    posologia_formato: '30 mg | c/ 8 hrs | 1 días',
    dosis_totales: 3,
    dosis_administradas: 3,
    dosis_pendientes: 0, // Completado
    indicaciones_especiales: 'Última dosis administrada sin complicaciones. Tratamiento concluido.',
    estado: 'FINALIZADA',
    fecha_prescripcion: '16/10/2026 16:30'
  },
  {
    id: 4,
    paciente_id: 3,
    medico_id: 3,
    medico_nombre: 'Dra. Camila Fuentes',
    medicamento_id: 5,
    medicamento: INITIAL_MEDICATIONS[4],
    posologia_formato: '100 mg | c/ 8 hrs | 2 días',
    dosis_totales: 6,
    dosis_administradas: 1,
    dosis_pendientes: 5,
    indicaciones_especiales: 'Bolo EV lento en 3 minutos. Evaluar respuesta bronquial.',
    estado: 'ACTIVA',
    fecha_prescripcion: '17/10/2026 12:00'
  }
];

export const INITIAL_LOGS: ClinicalLogEvent[] = [
  {
    id: 1,
    paciente_id: 1,
    medico_id: 2,
    medico_nombre: 'Dr. Mateo Morales',
    estado_previo: 'q1',
    estado_nuevo: 'q2',
    accion_evento: 'INGRESO_SALA',
    observaciones: 'Paciente ingresa a Cama 04-B para observación y monitoreo continuo.',
    signos_resumen: 'PA: 130/85, FC: 98, SpO2: 92%',
    fecha_registro: '17/10 01:30'
  },
  {
    id: 2,
    paciente_id: 1,
    medico_id: 2,
    medico_nombre: 'Dr. Mateo Morales',
    estado_previo: 'q2',
    estado_nuevo: 'q3',
    accion_evento: 'ACTUALIZAR_MEDICACION',
    observaciones: 'Prescripción de terapia antibiótica con Ceftriaxona 1g c/12h.',
    signos_resumen: 'PA: 122/78, FC: 84, SpO2: 97%',
    fecha_registro: '17/10 02:15'
  },
  {
    id: 3,
    paciente_id: 3,
    medico_id: 3,
    medico_nombre: 'Dra. Camila Fuentes',
    estado_previo: 'q2',
    estado_nuevo: 'q4',
    accion_evento: 'DETECCION_ALERTA',
    observaciones: 'Taquicardia en rango de alerta moderada (104 lpm) post administración de broncodilatador.',
    signos_resumen: 'FC: 104, SpO2: 94%, Temp: 37.4°C',
    fecha_registro: '17/10 12:45'
  }
];

export const INITIAL_DISCHARGE_REQUESTS: DischargeRequest[] = [
  {
    id: 1,
    paciente_id: 2,
    paciente_nombre: 'Fernando Rojas Morales',
    numero_cama: 'Cama 02-A',
    diagnostico: 'Cólico biliar agudo resuelto en observación post-analgesia.',
    medico_solicitante_id: 2,
    medico_solicitante_nombre: 'Dr. Mateo Morales',
    resumen_clinico: 'Paciente con excelente evolución post cólico biliar. Afebril más de 24 horas, abdomen completamente blando e indoloro, tolerancia oral adecuada sin vómitos.',
    criterios_cumplidos: [
      'Estabilidad hemodinámica comprobada por 12h',
      'Cero dosis pendientes de medicación parenteral',
      'Signos vitales normales (SpO2 99%, FC 72 lpm, PA 118/74)',
      'Tolerancia oral a líquidos y sólidos'
    ],
    estado: 'PENDIENTE',
    fecha_solicitud: '17/10/2026 18:25'
  }
];

export const INITIAL_AGENDA: AgendaEvent[] = [
  {
    id: 1,
    paciente_id: 1,
    paciente_nombre: 'Lucía Vargas Soto',
    numero_cama: 'Cama 04-B',
    medico_id: 2,
    medico_nombre: 'Dr. Mateo Morales',
    tipo_evento: 'RONDA_MEDICA',
    titulo: 'Ronda de Evolución Neumonía',
    descripcion: 'Auscultación pulmonar y revisión de exámenes de laboratorio matutinos.',
    fecha_inicio: '2026-10-18T09:00',
    fecha_fin: '2026-10-18T09:45',
    estado: 'PROGRAMADA'
  },
  {
    id: 2,
    paciente_id: 1,
    paciente_nombre: 'Lucía Vargas Soto',
    numero_cama: 'Cama 04-B',
    medico_id: 2,
    medico_nombre: 'Dr. Mateo Morales',
    tipo_evento: 'ADMINISTRACION_ENDOMED',
    titulo: 'Administración Ceftriaxona 1g',
    descripcion: '3ra dosis programada por enfermería vía catéter periférico.',
    fecha_inicio: '2026-10-18T14:00',
    fecha_fin: '2026-10-18T14:30',
    estado: 'PROGRAMADA'
  },
  {
    id: 3,
    paciente_id: 1,
    paciente_nombre: 'Lucía Vargas Soto',
    numero_cama: 'Cama 04-B',
    medico_id: 2,
    medico_nombre: 'Dr. Mateo Morales',
    tipo_evento: 'TERAPIA_KINESIOLOGIA',
    titulo: 'Kinesioterapia Respiratoria',
    descripcion: 'Ejercicios de expansión torácica y espirometría incentivada en camilla.',
    fecha_inicio: '2026-10-18T16:00',
    fecha_fin: '2026-10-18T16:45',
    estado: 'PROGRAMADA'
  },
  {
    id: 4,
    paciente_id: 2,
    paciente_nombre: 'Fernando Rojas Morales',
    numero_cama: 'Cama 02-A',
    medico_id: 2,
    medico_nombre: 'Dr. Mateo Morales',
    tipo_evento: 'CONTROL_POST_ALTA',
    titulo: 'Firma y Entrega de Epicrisis',
    descripcion: 'Entrega de receta de analgesia oral ambulatoria y cita de control.',
    fecha_inicio: '2026-10-17T21:30',
    fecha_fin: '2026-10-17T22:00',
    estado: 'PROGRAMADA'
  },
  {
    id: 5,
    paciente_id: 3,
    paciente_nombre: 'Beatriz Mendoza',
    numero_cama: 'Cama 06-B',
    medico_id: 3,
    medico_nombre: 'Dra. Camila Fuentes',
    tipo_evento: 'RONDA_MEDICA',
    titulo: 'Evaluación de Vía Aérea',
    descripcion: 'Verificación de patrón respiratorio post hidrocortisona y flujo espiratorio.',
    fecha_inicio: '2026-10-17T20:30',
    fecha_fin: '2026-10-17T21:00',
    estado: 'PROGRAMADA'
  }
];
