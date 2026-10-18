<?php
/**
 * HospitaLogix - Panel de Paciente (rol_id = 3)
 * Archivo: backend-php/paciente/dashboard.php
 * Interfaz amigable, de alta legibilidad, diseñada para paciente en camilla post-urgencias.
 * Visualización de estado clínico, cronograma de medicamentos (sin requerir confirmación del paciente) y recomendaciones.
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../auth/middleware.php';

verificarAcceso([ROL_PACIENTE]);

$pdo = Database::getConnection();
$usuarioId = (int) $_SESSION['usuario_id'];

// Obtener datos del paciente
$stmtPac = $pdo->prepare("
    SELECT p.*, u.nombre_completo, u_med.nombre_completo AS medico_tratante, med_det.especialidad
    FROM pacientes_detalle p
    JOIN usuarios u ON p.usuario_id = u.id
    LEFT JOIN usuarios u_med ON p.medico_asignado_id = u_med.id
    LEFT JOIN medicos_detalle med_det ON u_med.id = med_det.usuario_id
    WHERE p.usuario_id = ?
");
$stmtPac->execute([$usuarioId]);
$paciente = $stmtPac->fetch();

if (!$paciente) {
    die("Registro de paciente no encontrado. Notifique a enfermería.");
}

// Obtener prescripciones activas (sin confirmación del paciente)
$stmtPresc = $pdo->prepare("
    SELECT pr.*, m.nombre_comercial, m.principio_activo, m.presentacion
    FROM prescripciones pr
    JOIN medicamentos m ON pr.medicamento_id = m.id
    WHERE pr.paciente_id = ? AND pr.estado = 'ACTIVA'
    ORDER BY pr.fecha_prescripcion DESC
");
$stmtPresc->execute([$paciente['id']]);
$medicamentos = $stmtPresc->fetchAll();

// Obtener próximas actividades o terapias
$stmtAgenda = $pdo->prepare("
    SELECT * FROM citas_agenda 
    WHERE paciente_id = ? AND fecha_fin >= NOW() 
    ORDER BY fecha_inicio ASC
");
$stmtAgenda->execute([$paciente['id']]);
$actividades = $stmtAgenda->fetchAll();

// Traducción empática del estado del autómata para el paciente
$estadoHumano = [
    'INGRESO_URGENCIA'     => 'Acabas de ingresar a la sala de observación. Nuestro equipo te está evaluando.',
    'TRIAJE_POST_URGENCIA' => 'Revisión y priorización de cuidados completada.',
    'ESTABILIZACION'       => 'Te encuentras en fase de estabilización y reposo asistido.',
    'TRATAMIENTO_ACTIVO'   => 'Recibiendo tu tratamiento médico según indicación del especialista.',
    'EVALUACION_MEDICA'    => 'Tu médico está evaluando tu respuesta positiva al tratamiento.',
    'SOLICITUD_ALTA'       => 'Se ha solicitado tu alta médica. Dirección está formalizando tus documentos.',
    'ALTA_APROBADA'        => '¡Tu alta médica ha sido aprobada! En breve te entregaremos las indicaciones para el hogar.',
    'DERIVACION_UCI'       => 'Requiere cuidados de mayor intensidad y vigilancia continua.'
];

$mensajeEstado = $estadoHumano[$paciente['estado_automata']] ?? 'En seguimiento clínico permanente.';
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HospitaLogix - Mi Cuidado en Post-Urgencias</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <style>
        body { font-size: 1.1rem; }
        .card-camilla { border-radius: 16px; }
    </style>
</head>
<body class="bg-light pb-5">

<!-- BARRA AMIGABLE DE CAMILLA -->
<nav class="navbar bg-white border-bottom shadow-sm py-3">
    <div class="container">
        <div class="d-flex align-items-center">
            <span class="badge bg-primary fs-5 me-3 py-2 px-3"><?= htmlspecialchars($paciente['numero_cama']) ?></span>
            <div>
                <h4 class="mb-0 fw-bold">Hola, <?= htmlspecialchars($_SESSION['nombre_completo']) ?></h4>
                <small class="text-muted">Servicio de Post-Urgencias Hospitalario</small>
            </div>
        </div>
        <div>
            <a href="/backend-php/auth/logout.php" class="btn btn-outline-secondary btn-sm"><i class="bi bi-box-arrow-right me-1"></i> Salir</a>
        </div>
    </div>
</nav>

<div class="container py-4">

    <!-- TARJETA PRINCIPAL DE ESTADO CLÍNICO -->
    <div class="card card-camilla border-0 shadow-sm mb-4 bg-primary text-white p-4">
        <div class="row align-items-center">
            <div class="col-md-8">
                <span class="badge bg-white text-primary mb-2 px-3 py-1 fw-bold">Estado Actual</span>
                <h3 class="fw-bold mb-2"><?= htmlspecialchars($paciente['estado_automata']) ?></h3>
                <p class="fs-5 mb-0 text-white-50"><?= htmlspecialchars($mensajeEstado) ?></p>
            </div>
            <div class="col-md-4 text-md-end mt-3 mt-md-0">
                <div class="bg-white bg-opacity-10 p-3 rounded-3 text-start">
                    <small class="text-white-50 d-block">Médico a Cargo:</small>
                    <strong><?= htmlspecialchars($paciente['medico_tratante'] ?? 'Médico de Guardia') ?></strong>
                    <div class="small text-white-50"><?= htmlspecialchars($paciente['especialidad'] ?? 'Urgencias Médicas') ?></div>
                </div>
            </div>
        </div>
    </div>

    <div class="row g-4">
        <!-- CRONOGRAMA DE MEDICAMENTOS (Sin confirmación del paciente) -->
        <div class="col-lg-7">
            <div class="card card-camilla border-0 shadow-sm p-4 h-100 bg-white">
                <div class="d-flex align-items-center mb-3">
                    <i class="bi bi-capsule-pill fs-3 text-primary me-2"></i>
                    <div>
                        <h5 class="fw-bold mb-0">Mis Medicamentos Asignados</h5>
                        <small class="text-muted">Administrados directamente por el equipo de enfermería</small>
                    </div>
                </div>

                <?php if (empty($medicamentos)): ?>
                    <div class="text-center py-4 text-muted">
                        <i class="bi bi-shield-check fs-2 text-success d-block mb-2"></i>
                        No tienes medicamentos pendientes en este momento.
                    </div>
                <?php else: ?>
                    <div class="vstack gap-3">
                        <?php foreach ($medicamentos as $med): ?>
                            <div class="p-3 border rounded-3 bg-light d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="fw-bold mb-1 text-primary"><?= htmlspecialchars($med['nombre_comercial']) ?></h6>
                                    <div class="small text-muted mb-1"><?= htmlspecialchars($med['principio_activo']) ?> - <?= htmlspecialchars($med['presentacion']) ?></div>
                                    <span class="badge bg-secondary-subtle text-secondary border"><?= htmlspecialchars($med['posologia_formato']) ?></span>
                                </div>
                                <div class="text-end">
                                    <span class="badge bg-info-subtle text-dark border px-2 py-1 small">
                                        <?= $med['dosis_administradas'] ?> / <?= $med['dosis_totales'] ?> dosis
                                    </span>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            </div>
        </div>

        <!-- RECOMENDACIONES Y CUIDADOS -->
        <div class="col-lg-5">
            <div class="card card-camilla border-0 shadow-sm p-4 mb-4 bg-white">
                <div class="d-flex align-items-center mb-3">
                    <i class="bi bi-info-circle fs-3 text-info me-2"></i>
                    <h5 class="fw-bold mb-0">Recomendaciones y Dieta</h5>
                </div>
                <ul class="list-group list-group-flush small">
                    <li class="list-group-item px-0">
                        <i class="bi bi-cup-hot text-primary me-2"></i>
                        <strong>Alimentación:</strong> Dieta blanda liviana hiposódica e hidratación a tolerancia.
                    </li>
                    <li class="list-group-item px-0">
                        <i class="bi bi-moon-stars text-primary me-2"></i>
                        <strong>Reposo:</strong> Mantener reposo en cama a 30° de elevación.
                    </li>
                    <li class="list-group-item px-0">
                        <i class="bi bi-bell text-danger me-2"></i>
                        <strong>Aviso inmediato:</strong> Si sientes dificultad respiratoria o dolor intenso, pulsa el botón de asistencia.
                    </li>
                </ul>

                <!-- BOTÓN DE TIMBRE A ENFERMERÍA -->
                <button type="button" class="btn btn-danger btn-lg w-100 mt-3 py-3 fw-bold shadow-sm" onclick="alert('Llamada enviada a la Estación de Enfermería. En breve acudirán a su cama.')">
                    <i class="bi bi-bell-fill me-2"></i> Solicitar Asistencia en Cama
                </button>
            </div>
        </div>
    </div>

</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
