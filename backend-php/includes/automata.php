<?php
/**
 * HospitaLogix - Motor de Autómata Finito Determinista (AFD) Clínico
 * Archivo: backend-php/includes/automata.php
 * Gestiona el ciclo de vida del paciente en sala de post-urgencias:
 * Q = { INGRESO_URGENCIA, TRIAJE_POST_URGENCIA, ESTABILIZACION, TRATAMIENTO_ACTIVO, EVALUACION_MEDICA, SOLICITUD_ALTA, ALTA_APROBADA, DERIVACION_UCI }
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';

class AutomataPostUrgencias {
    // Definición formal de estados Q
    public const ESTADO_INGRESO           = 'INGRESO_URGENCIA';
    public const ESTADO_TRIAJE            = 'TRIAJE_POST_URGENCIA';
    public const ESTADO_ESTABILIZACION    = 'ESTABILIZACION';
    public const ESTADO_TRATAMIENTO       = 'TRATAMIENTO_ACTIVO';
    public const ESTADO_EVALUACION        = 'EVALUACION_MEDICA';
    public const ESTADO_SOLICITUD_ALTA    = 'SOLICITUD_ALTA';
    public const ESTADO_ALTA_APROBADA     = 'ALTA_APROBADA';
    public const ESTADO_DERIVACION_UCI    = 'DERIVACION_UCI';

    // Matriz de transiciones deterministas δ(q, a) -> q'
    private static array $transiciones = [
        self::ESTADO_INGRESO => [
            'TRIAR' => self::ESTADO_TRIAJE,
            'CRISIS_GRAVE' => self::ESTADO_DERIVACION_UCI
        ],
        self::ESTADO_TRIAJE => [
            'ESTABILIZAR' => self::ESTADO_ESTABILIZACION,
            'DETERIORO' => self::ESTADO_DERIVACION_UCI
        ],
        self::ESTADO_ESTABILIZACION => [
            'PRESCRIBIR_TRATAMIENTO' => self::ESTADO_TRATAMIENTO,
            'REVALORAR' => self::ESTADO_TRIAJE,
            'DETERIORO' => self::ESTADO_DERIVACION_UCI
        ],
        self::ESTADO_TRATAMIENTO => [
            'EVALUAR_RESPUESTA' => self::ESTADO_EVALUACION,
            'AJUSTAR_TERAPIA' => self::ESTADO_TRATAMIENTO,
            'DETERIORO' => self::ESTADO_DERIVACION_UCI
        ],
        self::ESTADO_EVALUACION => [
            'SOLICITAR_ALTA' => self::ESTADO_SOLICITUD_ALTA,
            'CONTINUAR_TRATAMIENTO' => self::ESTADO_TRATAMIENTO,
            'DETERIORO' => self::ESTADO_DERIVACION_UCI
        ],
        self::ESTADO_SOLICITUD_ALTA => [
            'APROBAR_ALTA' => self::ESTADO_ALTA_APROBADA,
            'RECHAZAR_ALTA' => self::ESTADO_EVALUACION,
            'DETERIORO' => self::ESTADO_DERIVACION_UCI
        ],
        self::ESTADO_ALTA_APROBADA => [],
        self::ESTADO_DERIVACION_UCI => []
    ];

    /**
     * Valida si un paciente cumple las condiciones de guarda médica para solicitar alta
     */
    public static function validarGuardasAlta(int $pacienteId, PDO $pdo): array {
        // 1. Verificar si existen alertas en los signos vitales más recientes
        $stmtVitals = $pdo->prepare("
            SELECT estado_alerta, presion_sistolica, presion_diastolica, 
                   frecuencia_cardiaca, temperatura, saturacion_oxigeno 
            FROM signos_vitales 
            WHERE paciente_id = ? 
            ORDER BY fecha_toma DESC 
            LIMIT 1
        ");
        $stmtVitals->execute([$pacienteId]);
        $ultimoSigno = $stmtVitals->fetch();

        if ($ultimoSigno && $ultimoSigno['estado_alerta'] !== 'NORMAL') {
            return [
                'apto' => false,
                'motivo' => sprintf(
                    'Paciente presenta estado clínico de %s (SpO2: %d%%, FC: %d lpm, Temp: %.1f°C). No se autoriza alta con signos inestables.',
                    $ultimoSigno['estado_alerta'],
                    $ultimoSigno['saturacion_oxigeno'],
                    $ultimoSigno['frecuencia_cardiaca'],
                    $ultimoSigno['temperatura']
                )
            ];
        }

        // 2. Verificar si tiene dosis activas pendientes de administración
        $stmtPresc = $pdo->prepare("
            SELECT SUM(dosis_pendientes) as total_pendientes
            FROM prescripciones 
            WHERE paciente_id = ? AND estado = 'ACTIVA'
        ");
        $stmtPresc->execute([$pacienteId]);
        $pendientes = (int) ($stmtPresc->fetchColumn() ?: 0);

        if ($pendientes > 0) {
            return [
                'apto' => false,
                'motivo' => "El paciente tiene {$pendientes} dosis de medicamentos endovenosos/orales pendientes en su pauta activa."
            ];
        }

        return ['apto' => true, 'motivo' => 'Paciente estable y con tratamiento completado. Listo para alta.'];
    }

    /**
     * Ejecuta una transición de estado en el autómata
     */
    public static function transicionar(
        int $pacienteId,
        int $medicoId,
        string $evento,
        string $observaciones,
        PDO $pdo
    ): array {
        $stmt = $pdo->prepare("SELECT estado_automata FROM pacientes_detalle WHERE id = ?");
        $stmt->execute([$pacienteId]);
        $estadoActual = $stmt->fetchColumn();

        if (!$estadoActual) {
            return ['exito' => false, 'error' => 'Paciente no encontrado.'];
        }

        if (!isset(self::$transiciones[$estadoActual][$evento])) {
            return [
                'exito' => false,
                'error' => "Transición no válida en el autómata: No se puede aplicar '{$evento}' desde el estado '{$estadoActual}'."
            ];
        }

        $nuevoEstado = self::$transiciones[$estadoActual][$evento];

        // Validar guarda estricta para SOLICITAR_ALTA
        if ($evento === 'SOLICITAR_ALTA') {
            $guarda = self::validarGuardasAlta($pacienteId, $pdo);
            if (!$guarda['apto']) {
                return ['exito' => false, 'error' => $guarda['motivo']];
            }
        }

        // Ejecutar transacción atómica en MySQL
        try {
            $pdo->beginTransaction();

            // 1. Actualizar estado del paciente
            $stmtUpd = $pdo->prepare("UPDATE pacientes_detalle SET estado_automata = ? WHERE id = ?");
            $stmtUpd->execute([$nuevoEstado, $pacienteId]);

            // 2. Registrar en la bitácora histórica
            $stmtLog = $pdo->prepare("
                INSERT INTO bitacora_paciente 
                (paciente_id, medico_id, estado_previo, estado_nuevo, accion_evento, observaciones) 
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmtLog->execute([
                $pacienteId,
                $medicoId,
                $estadoActual,
                $nuevoEstado,
                $evento,
                $observaciones
            ]);

            $pdo->commit();
            return [
                'exito' => true,
                'estado_previo' => $estadoActual,
                'nuevo_estado' => $nuevoEstado,
                'mensaje' => "Estado actualizado exitosamente a {$nuevoEstado}."
            ];
        } catch (Exception $e) {
            $pdo->rollBack();
            return ['exito' => false, 'error' => 'Error al persistir transición: ' . $e->getMessage()];
        }
    }
}
