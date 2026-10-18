<?php
/**
 * HospitaLogix - Módulo de Calendarios y Agendas Multi-Rol
 * Archivo: backend-php/agenda/calendario.php
 * Vista interactiva adaptada al rol en sesión:
 * - Admin (rol 1): Registro general, horarios médicos y citas.
 * - Médico (rol 2): Agenda de post-urgencias y citas, con opción de cancelar o reasignar pendientes.
 * - Paciente (rol 3): Calendario de solo lectura con tiempo estimado de internamiento y cronograma de terapias/medicamentos.
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../auth/middleware.php';

verificarAcceso([ROL_ADMIN, ROL_MEDICO, ROL_PACIENTE]);

$pdo = Database::getConnection();
$rolId = (int) $_SESSION['rol_id'];
$usuarioId = (int) $_SESSION['usuario_id'];
$mensaje = null;
$error = null;

// GESTIÓN DE ACCIONES MÉDICAS: Cancelar o reasignar cita (Solo Médico o Admin)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && in_array($rolId, [ROL_ADMIN, ROL_MEDICO], true)) {
    if (!validarCsrfToken($_POST['csrf_token'] ?? '')) {
        $error = 'Error de validación CSRF.';
    } else {
        $citaId = (int) ($_POST['cita_id'] ?? 0);
        $accion = $_POST['accion_cita'] ?? '';

        if ($accion === 'cancelar') {
            $stmtCanc = $pdo->prepare("UPDATE citas_agenda SET estado = 'CANCELADA' WHERE id = ?");
            $stmtCanc->execute([$citaId]);
            $mensaje = 'Evento de agenda cancelado.';
        } elseif ($accion === 'reasignar') {
            $nuevaFecha = $_POST['nueva_fecha_inicio'] ?? '';
            if (!empty($nuevaFecha)) {
                $stmtReas = $pdo->prepare("
                    UPDATE citas_agenda 
                    SET fecha_inicio = ?, fecha_fin = DATE_ADD(?, INTERVAL 1 HOUR), estado = 'REASIGNADA' 
                    WHERE id = ?
                ");
                $stmtReas->execute([$nuevaFecha, $nuevaFecha, $citaId]);
                $mensaje = 'Evento reasignado a nuevo horario.';
            }
        }
    }
}

// CONSULTA CONDICIONADA AL ROL
if ($rolId === ROL_ADMIN) {
    // Admin: Ve toda la sala, todos los médicos y pacientes
    $stmt = $pdo->query("
        SELECT c.*, p.numero_cama, u_pac.nombre_completo AS paciente_nombre, u_med.nombre_completo AS medico_nombre
        FROM citas_agenda c
        JOIN pacientes_detalle p ON c.paciente_id = p.id
        JOIN usuarios u_pac ON p.usuario_id = u_pac.id
        JOIN usuarios u_med ON c.medico_id = u_med.id
        ORDER BY c.fecha_inicio ASC
    ");
    $eventos = $stmt->fetchAll();
} elseif ($rolId === ROL_MEDICO) {
    // Médico: Ve sus citas y rondas asignadas
    $stmt = $pdo->prepare("
        SELECT c.*, p.numero_cama, u_pac.nombre_completo AS paciente_nombre, u_med.nombre_completo AS medico_nombre
        FROM citas_agenda c
        JOIN pacientes_detalle p ON c.paciente_id = p.id
        JOIN usuarios u_pac ON p.usuario_id = u_pac.id
        JOIN usuarios u_med ON c.medico_id = u_med.id
        WHERE c.medico_id = ?
        ORDER BY c.fecha_inicio ASC
    ");
    $stmt->execute([$usuarioId]);
    $eventos = $stmt->fetchAll();
} else {
    // Paciente: Solo lectura de sus terapias, medicamentos y controles
    $stmt = $pdo->prepare("
        SELECT c.*, p.numero_cama, p.tiempo_estimado_alta, u_pac.nombre_completo AS paciente_nombre, u_med.nombre_completo AS medico_nombre
        FROM citas_agenda c
        JOIN pacientes_detalle p ON c.paciente_id = p.id
        JOIN usuarios u_pac ON p.usuario_id = u_pac.id
        JOIN usuarios u_med ON c.medico_id = u_med.id
        WHERE p.usuario_id = ?
        ORDER BY c.fecha_inicio ASC
    ");
    $stmt->execute([$usuarioId]);
    $eventos = $stmt->fetchAll();
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HospitaLogix - Calendario y Agendas</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <style>
        .tabular-nums { font-variant-numeric: tabular-nums; }
    </style>
</head>
<body class="bg-light">

<nav class="navbar navbar-expand-lg bg-white border-bottom py-2">
    <div class="container-fluid px-4">
        <a class="navbar-brand fw-bold text-primary" href="#">
            <i class="bi bi-calendar3 me-2"></i> HospitaLogix <span class="badge bg-secondary-subtle text-secondary border ms-1">Agenda Clínica</span>
        </a>
        <div class="d-flex align-items-center gap-2">
            <span class="small text-muted me-2"><?= htmlspecialchars($_SESSION['nombre_completo']) ?> (Rol <?= $rolId ?>)</span>
            <a href="javascript:history.back()" class="btn btn-outline-secondary btn-sm"><i class="bi bi-arrow-left me-1"></i> Volver al Panel</a>
            <a href="/backend-php/auth/logout.php" class="btn btn-outline-danger btn-sm"><i class="bi bi-box-arrow-right"></i> Salir</a>
        </div>
    </div>
</nav>

<div class="container py-4">
    <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
            <h4 class="fw-bold mb-1">
                <?php if ($rolId === ROL_ADMIN): ?>
                    Programación General de Sala Post-Urgencias
                <?php elseif ($rolId === ROL_MEDICO): ?>
                    Mi Agenda de Rondas y Procedimientos
                <?php else: ?>
                    Mi Cronograma de Terapias y Medicamentos
                <?php endif; ?>
            </h4>
            <p class="text-muted small mb-0">Vista sincronizada en tiempo real con la base de datos de hospital_db.</p>
        </div>
        <span class="badge bg-primary fs-6 px-3 py-2"><i class="bi bi-clock me-1"></i> <?= date('d/m/Y') ?></span>
    </div>

    <?php if ($mensaje): ?>
        <div class="alert alert-success alert-dismissible fade show"><?= htmlspecialchars($mensaje) ?></div>
    <?php endif; ?>
    <?php if ($error): ?>
        <div class="alert alert-danger alert-dismissible fade show"><?= htmlspecialchars($error) ?></div>
    <?php endif; ?>

    <div class="card border-0 shadow-sm">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                    <tr>
                        <th>Fecha / Hora</th>
                        <th>Tipo de Evento</th>
                        <th>Título y Detalles</th>
                        <th>Cama / Paciente</th>
                        <th>Médico a Cargo</th>
                        <th>Estado</th>
                        <?php if ($rolId !== ROL_PACIENTE): ?>
                            <th>Acciones</th>
                        <?php endif; ?>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($eventos)): ?>
                        <tr>
                            <td colspan="7" class="text-center py-4 text-muted">No se registran eventos agendados para este período.</td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($eventos as $ev): ?>
                            <tr>
                                <td class="tabular-nums fw-semibold text-nowrap">
                                    <?= date('d/m/Y H:i', strtotime($ev['fecha_inicio'])) ?>
                                </td>
                                <td>
                                    <span class="badge bg-light text-dark border"><?= htmlspecialchars($ev['tipo_evento']) ?></span>
                                </td>
                                <td>
                                    <strong><?= htmlspecialchars($ev['titulo']) ?></strong>
                                    <?php if (!empty($ev['descripcion'])): ?>
                                        <div class="small text-muted"><?= htmlspecialchars($ev['descripcion']) ?></div>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <span class="badge bg-primary me-1"><?= htmlspecialchars($ev['numero_cama']) ?></span>
                                    <?= htmlspecialchars($ev['paciente_nombre']) ?>
                                </td>
                                <td><?= htmlspecialchars($ev['medico_nombre']) ?></td>
                                <td>
                                    <?php if ($ev['estado'] === 'PROGRAMADA'): ?>
                                        <span class="badge bg-primary">Programada</span>
                                    <?php elseif ($ev['estado'] === 'REASIGNADA'): ?>
                                        <span class="badge bg-warning text-dark">Reasignada</span>
                                    <?php elseif ($ev['estado'] === 'CANCELADA'): ?>
                                        <span class="badge bg-danger">Cancelada</span>
                                    <?php else: ?>
                                        <span class="badge bg-success">Completada</span>
                                    <?php endif; ?>
                                </td>
                                <?php if ($rolId !== ROL_PACIENTE): ?>
                                    <td>
                                        <?php if ($ev['estado'] === 'PROGRAMADA' || $ev['estado'] === 'REASIGNADA'): ?>
                                            <form method="POST" class="d-inline-flex gap-1 align-items-center">
                                                <input type="hidden" name="csrf_token" value="<?= obtenerCsrfToken() ?>">
                                                <input type="hidden" name="cita_id" value="<?= $ev['id'] ?>">
                                                <input type="datetime-local" name="nueva_fecha_inicio" class="form-control form-control-sm" style="width: 170px;">
                                                <button type="submit" name="accion_cita" value="reasignar" class="btn btn-outline-warning btn-sm" title="Reasignar"><i class="bi bi-clock-history"></i></button>
                                                <button type="submit" name="accion_cita" value="cancelar" class="btn btn-outline-danger btn-sm" title="Cancelar"><i class="bi bi-x-circle"></i></button>
                                            </form>
                                        <?php else: ?>
                                            <span class="text-muted small">Cerrado</span>
                                        <?php endif; ?>
                                    </td>
                                <?php endif; ?>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
