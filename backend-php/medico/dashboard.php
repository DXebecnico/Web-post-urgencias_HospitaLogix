<?php
/**
 * HospitaLogix - Panel de Médico (rol_id = 2)
 * Archivo: backend-php/medico/dashboard.php
 * Selector de pacientes, autómata clínico AFD dinámico, signos vitales con alertas,
 * módulo de prescripciones con validación Regex y restricción de alta médica.
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../auth/middleware.php';
require_once __DIR__ . '/../includes/automata.php';

verificarAcceso([ROL_MEDICO]);

$pdo = Database::getConnection();
$medicoId = (int) $_SESSION['usuario_id'];
$mensaje = null;
$error = null;

// Paciente seleccionado (por GET o por defecto el primero)
$pacienteSeleccionadoId = isset($_GET['paciente_id']) ? (int) $_GET['paciente_id'] : 0;

// OBTENER LISTA DE PACIENTES PARA EL SELECTOR
$stmtPacientes = $pdo->query("
    SELECT p.id, p.numero_cama, p.diagnostico_ingreso, p.estado_automata, u.nombre_completo, u.rut_dni
    FROM pacientes_detalle p
    JOIN usuarios u ON p.usuario_id = u.id
    WHERE p.estado_automata != 'ALTA_APROBADA'
    ORDER BY p.numero_cama ASC
");
$todosPacientes = $stmtPacientes->fetchAll();

if ($pacienteSeleccionadoId === 0 && !empty($todosPacientes)) {
    $pacienteSeleccionadoId = (int) $todosPacientes[0]['id'];
}

// PROCESAR CAMBIO DE ESTADO EN EL AUTÓMATA (AFD)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['accion_automata'])) {
    if (!validarCsrfToken($_POST['csrf_token'] ?? '')) {
        $error = 'Validación CSRF fallida.';
    } else {
        $evento = $_POST['evento'];
        $obs = trim($_POST['observaciones_evento'] ?? 'Transición realizada por médico de turno');
        $resTrans = AutomataPostUrgencias::transicionar($pacienteSeleccionadoId, $medicoId, $evento, $obs, $pdo);

        if ($resTrans['exito']) {
            $mensaje = $resTrans['mensaje'];
        } else {
            $error = $resTrans['error'];
        }
    }
}

// PROCESAR NUEVA PRESCRIPCIÓN CON VALIDACIÓN REGEX
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['accion_prescribir'])) {
    if (!validarCsrfToken($_POST['csrf_token'] ?? '')) {
        $error = 'Validación CSRF fallida.';
    } else {
        $medicamentoId = (int) $_POST['medicamento_id'];
        $posologia = trim($_POST['posologia_formato'] ?? '');
        $dosisTotales = (int) ($_POST['dosis_totales'] ?? 1);
        $indicaciones = trim($_POST['indicaciones_especiales'] ?? '');

        // EXPRESIÓN REGULAR INSTITUCIONAL (Dosis | Frecuencia | Duración)
        // Ej: "1 g | c/ 12 hrs | 3 días" o "500 mg | c/ 8 hrs | 5 días"
        $patronRegex = '/^\d{1,4}\s?(mg|g|ml|UI|gotas)\s*\|\s*c\/\s*\d{1,2}\s*hrs?\s*\|\s*\d{1,2}\s*días?$/i';

        if (!preg_match($patronRegex, $posologia)) {
            $error = 'Formato de posología no válido. Debe cumplir la norma: [Dosis con unidad] | c/ [Horas] hrs | [Días] días (Ej: "1 g | c/ 12 hrs | 3 días").';
        } else {
            // Verificar stock disponible en inventario
            $stmtStock = $pdo->prepare("SELECT stock_actual FROM inventario_medicamentos WHERE medicamento_id = ? ORDER BY fecha_vencimiento ASC LIMIT 1");
            $stmtStock->execute([$medicamentoId]);
            $stockActual = (int) ($stmtStock->fetchColumn() ?: 0);

            if ($stockActual < $dosisTotales) {
                $error = "Stock insuficiente en farmacia. Stock actual: {$stockActual} unidades. Solicite reabastecimiento a administración.";
            } else {
                try {
                    $pdo->beginTransaction();

                    $stmtInsertPresc = $pdo->prepare("
                        INSERT INTO prescripciones 
                        (paciente_id, medico_id, medicamento_id, posologia_formato, dosis_totales, dosis_administradas, dosis_pendientes, indicaciones_especiales) 
                        VALUES (?, ?, ?, ?, ?, 0, ?, ?)
                    ");
                    $stmtInsertPresc->execute([
                        $pacienteSeleccionadoId,
                        $medicoId,
                        $medicamentoId,
                        $posologia,
                        $dosisTotales,
                        $dosisTotales,
                        $indicaciones
                    ]);

                    // Descontar inventario (controlando no negativos)
                    $stmtUpdInv = $pdo->prepare("
                        UPDATE inventario_medicamentos 
                        SET stock_actual = stock_actual - ?, cantidad_utilizada = cantidad_utilizada + ? 
                        WHERE medicamento_id = ? AND stock_actual >= ? 
                        ORDER BY fecha_vencimiento ASC LIMIT 1
                    ");
                    $stmtUpdInv->execute([$dosisTotales, $dosisTotales, $medicamentoId, $dosisTotales]);

                    $pdo->commit();
                    $mensaje = 'Prescripción médica emitida y descontada del stock de farmacia.';
                } catch (Exception $e) {
                    $pdo->rollBack();
                    $error = 'Error al registrar prescripción: ' . $e->getMessage();
                }
            }
        }
    }
}

// PROCESAR TOMA DE SIGNOS VITALES
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['accion_signos'])) {
    if (!validarCsrfToken($_POST['csrf_token'] ?? '')) {
        $error = 'Validación CSRF fallida.';
    } else {
        $pas = (int) $_POST['presion_sistolica'];
        $pad = (int) $_POST['presion_diastolica'];
        $fc = (int) $_POST['frecuencia_cardiaca'];
        $fr = (int) $_POST['frecuencia_respiratoria'];
        $temp = (float) $_POST['temperatura'];
        $spo2 = (int) $_POST['saturacion_oxigeno'];
        $eva = (int) ($_POST['nivel_dolor_eva'] ?? 0);
        $comentario = trim($_POST['comentarios_clinicos'] ?? '');

        // Algoritmo de clasificación de alerta médica
        $alerta = 'NORMAL';
        if ($spo2 < 90 || $fc > 130 || $fc < 45 || $temp >= 39.0 || $pas >= 180 || $pas < 85) {
            $alerta = 'ALERTA_CRITICA';
        } elseif ($spo2 < 94 || $fc > 100 || $fc < 55 || $temp >= 38.0 || $pas >= 145 || $eva >= 6) {
            $alerta = 'ALERTA_MODERADA';
        }

        $stmtSig = $pdo->prepare("
            INSERT INTO signos_vitales 
            (paciente_id, medico_o_enfermero_id, presion_sistolica, presion_diastolica, frecuencia_cardiaca, frecuencia_respiratoria, temperatura, saturacion_oxigeno, nivel_dolor_eva, estado_alerta, comentarios_clinicos) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmtSig->execute([$pacienteSeleccionadoId, $medicoId, $pas, $pad, $fc, $fr, $temp, $spo2, $eva, $alerta, $comentario]);
        $mensaje = 'Signos vitales registrados en la bitácora clínica.';
    }
}

// CARGAR DETALLES DEL PACIENTE SELECCIONADO
$stmtCurPac = $pdo->prepare("
    SELECT p.*, u.nombre_completo, u.rut_dni, u.telefono 
    FROM pacientes_detalle p 
    JOIN usuarios u ON p.usuario_id = u.id 
    WHERE p.id = ?
");
$stmtCurPac->execute([$pacienteSeleccionadoId]);
$pacienteActivo = $stmtCurPac->fetch();

// ÚLTIMOS SIGNOS VITALES
$stmtUltSignos = $pdo->prepare("SELECT * FROM signos_vitales WHERE paciente_id = ? ORDER BY fecha_toma DESC LIMIT 5");
$stmtUltSignos->execute([$pacienteSeleccionadoId]);
$historialSignos = $stmtUltSignos->fetchAll();
$signoMasReciente = $historialSignos[0] ?? null;

// PRESCRIPCIONES ACTIVAS
$stmtPrescripciones = $pdo->prepare("
    SELECT pr.*, m.nombre_comercial, m.principio_activo, m.presentacion 
    FROM prescripciones pr 
    JOIN medicamentos m ON pr.medicamento_id = m.id 
    WHERE pr.paciente_id = ? 
    ORDER BY pr.fecha_prescripcion DESC
");
$stmtPrescripciones->execute([$pacienteSeleccionadoId]);
$prescripcionesPaciente = $stmtPrescripciones->fetchAll();

// BITÁCORA DEL AUTÓMATA
$stmtBit = $pdo->prepare("
    SELECT b.*, u.nombre_completo AS medico_nombre 
    FROM bitacora_paciente b 
    JOIN usuarios u ON b.medico_id = u.id 
    WHERE b.paciente_id = ? 
    ORDER BY b.fecha_registro DESC 
    LIMIT 8
");
$stmtBit->execute([$pacienteSeleccionadoId]);
$bitacoraEventos = $stmtBit->fetchAll();

// CATÁLOGO DE MEDICAMENTOS PARA PRESCRIPCIÓN
$catalogoMeds = $pdo->query("SELECT id, nombre_comercial, principio_activo, presentacion FROM medicamentos ORDER BY nombre_comercial ASC")->fetchAll();

// VALIDACIÓN DE GUARDAS DE ALTA
$guardaAlta = AutomataPostUrgencias::validarGuardasAlta($pacienteSeleccionadoId, $pdo);

// LISTA SECUENCIAL DE ESTADOS DEL AFD PARA VISUALIZACIÓN DINÁMICA
$estadosAFD = [
    'INGRESO_URGENCIA' => 'Ingreso Urgencia',
    'TRIAJE_POST_URGENCIA' => 'Triaje Post-Urgencia',
    'ESTABILIZACION' => 'Estabilización',
    'TRATAMIENTO_ACTIVO' => 'Tratamiento Activo',
    'EVALUACION_MEDICA' => 'Evaluación Médica',
    'SOLICITUD_ALTA' => 'Solicitud de Alta',
    'ALTA_APROBADA' => 'Alta Aprobada'
];
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HospitaLogix - Estación Médica Post-Urgencias</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <style>
        .tabular-nums { font-variant-numeric: tabular-nums; }
        .afd-step { flex: 1; text-align: center; position: relative; padding: 10px 5px; font-size: 0.75rem; font-weight: 600; }
        .afd-step.active { background-color: #0d6efd; color: #fff; border-radius: 6px; }
        .afd-step.completed { background-color: #e9ecef; color: #198754; border-radius: 6px; }
    </style>
</head>
<body class="bg-light">

<!-- NAV SUPERIOR -->
<nav class="navbar navbar-expand-lg bg-white border-bottom py-2">
    <div class="container-fluid px-4">
        <a class="navbar-brand fw-bold text-primary d-flex align-items-center" href="#">
            <i class="bi bi-heart-pulse-fill me-2"></i> HospitaLogix <span class="badge bg-primary-subtle text-primary border ms-2">Estación Médica</span>
        </a>
        <div class="d-flex align-items-center gap-3">
            <span class="small text-muted"><i class="bi bi-person-badge me-1"></i> <?= htmlspecialchars($_SESSION['nombre_completo']) ?></span>
            <a href="/backend-php/agenda/calendario.php" class="btn btn-outline-secondary btn-sm"><i class="bi bi-calendar-event me-1"></i> Mi Agenda</a>
            <a href="/backend-php/auth/logout.php" class="btn btn-outline-danger btn-sm"><i class="bi bi-box-arrow-right"></i> Salir</a>
        </div>
    </div>
</nav>

<div class="container-fluid px-4 py-3">

    <!-- SELECTOR DE PACIENTE RÁPIDO -->
    <div class="card border-0 shadow-sm p-3 mb-3 bg-white">
        <div class="row align-items-center g-2">
            <div class="col-md-3">
                <label class="form-label small fw-bold text-muted mb-1"><i class="bi bi-person-lines-fill me-1"></i> Paciente en Observación:</label>
                <form method="GET" action="dashboard.php" id="formSelectPaciente">
                    <select name="paciente_id" class="form-select form-select-sm fw-bold" onchange="document.getElementById('formSelectPaciente').submit();">
                        <?php foreach ($todosPacientes as $p): ?>
                            <option value="<?= $p['id'] ?>" <?= $p['id'] == $pacienteSeleccionadoId ? 'selected' : '' ?>>
                                [<?= htmlspecialchars($p['numero_cama']) ?>] <?= htmlspecialchars($p['nombre_completo']) ?> - <?= htmlspecialchars($p['diagnostico_ingreso']) ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </form>
            </div>
            <div class="col-md-6 border-start border-end px-3">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="badge bg-primary"><?= htmlspecialchars($pacienteActivo['numero_cama']) ?></span>
                    <span class="small text-muted">RUT: <?= htmlspecialchars($pacienteActivo['rut_dni']) ?></span>
                    <span class="small text-muted">Grupo: <strong><?= htmlspecialchars($pacienteActivo['grupo_sanguineo']) ?></strong></span>
                    <span class="small text-danger">Alergias: <strong><?= htmlspecialchars($pacienteActivo['alergias']) ?></strong></span>
                </div>
                <div class="small fw-semibold text-truncate text-secondary">
                    Diagnóstico: <?= htmlspecialchars($pacienteActivo['diagnostico_ingreso']) ?>
                </div>
            </div>
            <div class="col-md-3 text-end">
                <div class="small text-muted mb-1">Restricción de Alta Médica:</div>
                <?php if ($guardaAlta['apto']): ?>
                    <span class="badge bg-success-subtle text-success border border-success p-2 w-100"><i class="bi bi-check-circle me-1"></i> Apto para Solicitar Alta</span>
                <?php else: ?>
                    <span class="badge bg-danger-subtle text-danger border border-danger p-2 w-100 text-truncate" title="<?= htmlspecialchars($guardaAlta['motivo']) ?>">
                        <i class="bi bi-lock-fill me-1"></i> Bloqueado: <?= htmlspecialchars($guardaAlta['motivo']) ?>
                    </span>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <?php if ($mensaje): ?>
        <div class="alert alert-success alert-dismissible fade show py-2 small"><?= htmlspecialchars($mensaje) ?></div>
    <?php endif; ?>
    <?php if ($error): ?>
        <div class="alert alert-danger alert-dismissible fade show py-2 small"><i class="bi bi-exclamation-triangle-fill me-1"></i> <?= htmlspecialchars($error) ?></div>
    <?php endif; ?>

    <!-- VISUALIZACIÓN DINÁMICA DEL AUTÓMATA FINITO DETERMINISTA (AFD) -->
    <div class="card border-0 shadow-sm mb-3">
        <div class="card-header bg-white py-2 d-flex justify-content-between align-items-center">
            <span class="small fw-bold text-uppercase text-muted"><i class="bi bi-diagram-3-fill text-primary me-1"></i> Flujo Clínico del Autómata Finito Determinista (AFD)</span>
            <span class="badge bg-info-subtle text-dark border">Estado Actual: <?= htmlspecialchars($pacienteActivo['estado_automata']) ?></span>
        </div>
        <div class="card-body p-3">
            <div class="d-flex flex-wrap gap-2 mb-3">
                <?php 
                $encontradoActual = false;
                foreach ($estadosAFD as $clave => $etiqueta): 
                    $esActual = $pacienteActivo['estado_automata'] === $clave;
                    $clase = $esActual ? 'active shadow-sm' : ($encontradoActual ? 'text-muted' : 'completed');
                    if ($esActual) { $encontradoActual = true; }
                ?>
                    <div class="afd-step <?= $clase ?>">
                        <i class="bi <?= $esActual ? 'bi-record-circle-fill' : 'bi-check2' ?> me-1"></i>
                        <?= htmlspecialchars($etiqueta) ?>
                    </div>
                <?php endforeach; ?>
            </div>

            <!-- CONTROLES DE TRANSICIÓN DEL AUTÓMATA -->
            <div class="p-2 bg-light rounded d-flex flex-wrap align-items-center gap-2">
                <span class="small fw-semibold text-secondary me-2">Transicionar a:</span>
                <form method="POST" class="d-inline">
                    <input type="hidden" name="csrf_token" value="<?= obtenerCsrfToken() ?>">
                    <input type="hidden" name="accion_automata" value="1">
                    <input type="hidden" name="observaciones_evento" value="Avance a tratamiento activo tras estabilización">
                    <button type="submit" name="evento" value="PRESCRIBIR_TRATAMIENTO" class="btn btn-outline-primary btn-sm">Tratamiento Activo</button>
                </form>
                <form method="POST" class="d-inline">
                    <input type="hidden" name="csrf_token" value="<?= obtenerCsrfToken() ?>">
                    <input type="hidden" name="accion_automata" value="1">
                    <input type="hidden" name="observaciones_evento" value="Paciente evaluado clínicamente, buena respuesta ventilatoria y hemodinámica">
                    <button type="submit" name="evento" value="EVALUAR_RESPUESTA" class="btn btn-outline-info btn-sm">Evaluación Médica</button>
                </form>
                <form method="POST" class="d-inline">
                    <input type="hidden" name="csrf_token" value="<?= obtenerCsrfToken() ?>">
                    <input type="hidden" name="accion_automata" value="1">
                    <input type="hidden" name="observaciones_evento" value="Solicitud formal de alta enviada a Dirección Médica">
                    <button type="submit" name="evento" value="SOLICITAR_ALTA" class="btn btn-success btn-sm" <?= !$guardaAlta['apto'] ? 'disabled title="Restricción: Paciente en alerta o con dosis pendientes"' : '' ?>>
                        <i class="bi bi-send-check me-1"></i> Solicitar Alta a Dirección
                    </button>
                </form>
                <form method="POST" class="d-inline ms-auto">
                    <input type="hidden" name="csrf_token" value="<?= obtenerCsrfToken() ?>">
                    <input type="hidden" name="accion_automata" value="1">
                    <input type="hidden" name="observaciones_evento" value="Alerta de deterioro clínico en sala de post-urgencias">
                    <button type="submit" name="evento" value="DETERIORO" class="btn btn-outline-danger btn-sm"><i class="bi bi-exclamation-octagon me-1"></i> Derivación UCI</button>
                </form>
            </div>
        </div>
    </div>

    <div class="row g-3">
        <!-- SECCIÓN IZQUIERDA: SIGNOS VITALES Y REPORTE -->
        <div class="col-lg-6">
            <div class="card border-0 shadow-sm mb-3">
                <div class="card-header bg-white py-2 d-flex justify-content-between align-items-center">
                    <span class="fw-bold small text-muted"><i class="bi bi-activity text-danger me-1"></i> Monitoreo de Signos Vitales</span>
                    <?php if ($signoMasReciente): ?>
                        <span class="badge <?= $signoMasReciente['estado_alerta'] === 'NORMAL' ? 'bg-success' : 'bg-danger' ?>">
                            <?= $signoMasReciente['estado_alerta'] ?>
                        </span>
                    <?php endif; ?>
                </div>
                <div class="card-body p-3">
                    <?php if ($signoMasReciente): ?>
                        <div class="row text-center g-2 mb-3">
                            <div class="col-4">
                                <div class="p-2 border rounded bg-light">
                                    <small class="text-muted d-block">Presión Art.</small>
                                    <strong class="tabular-nums fs-6"><?= $signoMasReciente['presion_sistolica'] ?>/<?= $signoMasReciente['presion_diastolica'] ?></strong> <small class="text-muted">mmHg</small>
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="p-2 border rounded bg-light">
                                    <small class="text-muted d-block">Frec. Cardíaca</small>
                                    <strong class="tabular-nums fs-6 <?= $signoMasReciente['frecuencia_cardiaca'] > 100 ? 'text-danger' : 'text-primary' ?>"><?= $signoMasReciente['frecuencia_cardiaca'] ?></strong> <small class="text-muted">lpm</small>
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="p-2 border rounded bg-light">
                                    <small class="text-muted d-block">Sat. Oxígeno</small>
                                    <strong class="tabular-nums fs-6 <?= $signoMasReciente['saturacion_oxigeno'] < 94 ? 'text-danger' : 'text-success' ?>"><?= $signoMasReciente['saturacion_oxigeno'] ?>%</strong>
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="p-2 border rounded bg-light">
                                    <small class="text-muted d-block">Frec. Resp.</small>
                                    <strong class="tabular-nums fs-6"><?= $signoMasReciente['frecuencia_respiratoria'] ?></strong> <small class="text-muted">rpm</small>
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="p-2 border rounded bg-light">
                                    <small class="text-muted d-block">Temperatura</small>
                                    <strong class="tabular-nums fs-6 <?= $signoMasReciente['temperatura'] >= 38 ? 'text-danger' : '' ?>"><?= $signoMasReciente['temperatura'] ?>°C</strong>
                                </div>
                            </div>
                            <div class="col-4">
                                <div class="p-2 border rounded bg-light">
                                    <small class="text-muted d-block">Dolor (EVA)</small>
                                    <strong class="tabular-nums fs-6"><?= $signoMasReciente['nivel_dolor_eva'] ?>/10</strong>
                                </div>
                            </div>
                        </div>
                    <?php endif; ?>

                    <!-- Formulario de toma de signos -->
                    <form method="POST">
                        <input type="hidden" name="csrf_token" value="<?= obtenerCsrfToken() ?>">
                        <input type="hidden" name="accion_signos" value="1">
                        <div class="row g-2 mb-2">
                            <div class="col-6 col-md-3">
                                <label class="small text-muted">Sistólica</label>
                                <input type="number" name="presion_sistolica" class="form-control form-control-sm" value="120" required>
                            </div>
                            <div class="col-6 col-md-3">
                                <label class="small text-muted">Diastólica</label>
                                <input type="number" name="presion_diastolica" class="form-control form-control-sm" value="80" required>
                            </div>
                            <div class="col-6 col-md-3">
                                <label class="small text-muted">FC (lpm)</label>
                                <input type="number" name="frecuencia_cardiaca" class="form-control form-control-sm" value="78" required>
                            </div>
                            <div class="col-6 col-md-3">
                                <label class="small text-muted">FR (rpm)</label>
                                <input type="number" name="frecuencia_respiratoria" class="form-control form-control-sm" value="16" required>
                            </div>
                            <div class="col-6 col-md-4">
                                <label class="small text-muted">Temp (°C)</label>
                                <input type="number" step="0.1" name="temperatura" class="form-control form-control-sm" value="36.6" required>
                            </div>
                            <div class="col-6 col-md-4">
                                <label class="small text-muted">SpO2 (%)</label>
                                <input type="number" name="saturacion_oxigeno" class="form-control form-control-sm" value="98" required>
                            </div>
                            <div class="col-6 col-md-4">
                                <label class="small text-muted">Dolor EVA (0-10)</label>
                                <input type="number" min="0" max="10" name="nivel_dolor_eva" class="form-control form-control-sm" value="2">
                            </div>
                        </div>
                        <div class="mb-2">
                            <textarea name="comentarios_clinicos" class="form-control form-control-sm" rows="2" placeholder="Observaciones clínicas y evolución..."></textarea>
                        </div>
                        <button type="submit" class="btn btn-outline-primary btn-sm w-100"><i class="bi bi-save me-1"></i> Registrar Signos y Notas</button>
                    </form>
                </div>
            </div>
        </div>

        <!-- SECCIÓN DERECHA: PRESCRIPCIÓN MÉDICA CON VALIDACIÓN REGEX -->
        <div class="col-lg-6">
            <div class="card border-0 shadow-sm mb-3">
                <div class="card-header bg-white py-2 d-flex justify-content-between align-items-center">
                    <span class="fw-bold small text-muted"><i class="bi bi-prescription text-primary me-1"></i> Prescripción Farmacológica</span>
                    <span class="badge bg-light text-muted border">Validación Regex Posología</span>
                </div>
                <div class="card-body p-3">
                    <form method="POST" class="mb-3">
                        <input type="hidden" name="csrf_token" value="<?= obtenerCsrfToken() ?>">
                        <input type="hidden" name="accion_prescribir" value="1">

                        <div class="mb-2">
                            <label class="small text-muted fw-semibold">Medicamento</label>
                            <select name="medicamento_id" class="form-select form-select-sm" required>
                                <?php foreach ($catalogoMeds as $med): ?>
                                    <option value="<?= $med['id'] ?>">
                                        <?= htmlspecialchars($med['nombre_comercial']) ?> (<?= htmlspecialchars($med['principio_activo']) ?> - <?= htmlspecialchars($med['presentacion']) ?>)
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>

                        <div class="mb-2">
                            <label class="small text-muted fw-semibold">Posología Clínica (Formato Regex Obligatorio)</label>
                            <input type="text" name="posologia_formato" class="form-control form-control-sm" placeholder="Ej: 1 g | c/ 12 hrs | 3 días" required pattern="^\d{1,4}\s?(mg|g|ml|UI|gotas)\s*\|\s*c\/\s*\d{1,2}\s*hrs?\s*\|\s*\d{1,2}\s*días?$">
                            <small class="form-text text-muted" style="font-size: 0.75rem;">Norma: <code>Dosis | c/ Frecuencia hrs | Duración días</code></small>
                        </div>

                        <div class="row g-2 mb-2">
                            <div class="col-6">
                                <label class="small text-muted">Dosis Totales</label>
                                <input type="number" name="dosis_totales" class="form-control form-control-sm" value="6" min="1" max="50" required>
                            </div>
                            <div class="col-6">
                                <label class="small text-muted">Indicaciones de Enfermería</label>
                                <input type="text" name="indicaciones_especiales" class="form-control form-control-sm" placeholder="Vía EV en 100ml SF 0.9%">
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary btn-sm w-100"><i class="bi bi-file-earmark-medical me-1"></i> Emitir Prescripción y Reservar Fármaco</button>
                    </form>

                    <!-- Lista de prescripciones activas -->
                    <h6 class="small fw-bold text-muted border-bottom pb-1">Medicamentos Activos Asignados:</h6>
                    <?php if (empty($prescripcionesPaciente)): ?>
                        <p class="small text-muted mb-0">Sin prescripciones vigentes.</p>
                    <?php else: ?>
                        <div class="list-group list-group-flush">
                            <?php foreach ($prescripcionesPaciente as $pr): ?>
                                <div class="list-group-item px-0 py-2 d-flex justify-content-between align-items-center">
                                    <div>
                                        <strong class="small"><?= htmlspecialchars($pr['nombre_comercial']) ?></strong>
                                        <div class="text-muted" style="font-size: 0.75rem;"><?= htmlspecialchars($pr['posologia_formato']) ?></div>
                                    </div>
                                    <div class="text-end">
                                        <span class="badge <?= $pr['dosis_pendientes'] > 0 ? 'bg-warning text-dark' : 'bg-success' ?>">
                                            <?= $pr['dosis_pendientes'] ?> pendientes
                                        </span>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
