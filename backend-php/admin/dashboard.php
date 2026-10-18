<?php
/**
 * HospitaLogix - Panel de Administrador (rol_id = 1)
 * Archivo: backend-php/admin/dashboard.php
 * Estadísticas interactivas, gestión de usuarios, inventario de medicamentos y aprobación de altas
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../auth/middleware.php';

verificarAcceso([ROL_ADMIN]);

$pdo = Database::getConnection();
$mensaje = null;
$error = null;

// PROCESAR APROBACIÓN O RECHAZO DE ALTA MÉDICA
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['accion_alta'])) {
    if (!validarCsrfToken($_POST['csrf_token'] ?? '')) {
        $error = 'Error de validación CSRF.';
    } else {
        $solicitudId = (int) $_POST['solicitud_id'];
        $pacienteId = (int) $_POST['paciente_id'];
        $decision = $_POST['accion_alta'] === 'aprobar' ? 'APROBADA' : 'RECHAZADA';
        $motivo = trim($_POST['motivo_resolucion'] ?? '');

        try {
            $pdo->beginTransaction();

            $stmtAlta = $pdo->prepare("
                UPDATE solicitudes_alta 
                SET estado = ?, admin_aprobador_id = ?, fecha_resolucion = NOW(), motivo_rechazo = ? 
                WHERE id = ?
            ");
            $stmtAlta->execute([$decision, $_SESSION['usuario_id'], $motivo, $solicitudId]);

            // Si es aprobada, actualizar autómata a ALTA_APROBADA
            if ($decision === 'APROBADA') {
                $stmtPac = $pdo->prepare("UPDATE pacientes_detalle SET estado_automata = 'ALTA_APROBADA' WHERE id = ?");
                $stmtPac->execute([$pacienteId]);

                $stmtBit = $pdo->prepare("
                    INSERT INTO bitacora_paciente (paciente_id, medico_id, estado_previo, estado_nuevo, accion_evento, observaciones)
                    VALUES (?, ?, 'SOLICITUD_ALTA', 'ALTA_APROBADA', 'APROBAR_ALTA', ?)
                ");
                $stmtBit->execute([$pacienteId, $_SESSION['usuario_id'], 'Alta aprobada administrativamente por Dirección Médica: ' . $motivo]);
            } else {
                // Si es rechazada, retroceder a EVALUACION_MEDICA
                $stmtPac = $pdo->prepare("UPDATE pacientes_detalle SET estado_automata = 'EVALUACION_MEDICA' WHERE id = ?");
                $stmtPac->execute([$pacienteId]);

                $stmtBit = $pdo->prepare("
                    INSERT INTO bitacora_paciente (paciente_id, medico_id, estado_previo, estado_nuevo, accion_evento, observaciones)
                    VALUES (?, ?, 'SOLICITUD_ALTA', 'EVALUACION_MEDICA', 'RECHAZAR_ALTA', ?)
                ");
                $stmtBit->execute([$pacienteId, $_SESSION['usuario_id'], 'Alta observada y rechazada por Administración: ' . $motivo]);
            }

            $pdo->commit();
            $mensaje = "Solicitud de alta {$decision} con éxito.";
        } catch (Exception $e) {
            $pdo->rollBack();
            $error = 'Error al procesar alta: ' . $e->getMessage();
        }
    }
}

// PROCESAR REABASTECIMIENTO DE MEDICAMENTO (Evitando negativos)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['accion_reabastecer'])) {
    if (!validarCsrfToken($_POST['csrf_token'] ?? '')) {
        $error = 'Error de validación CSRF.';
    } else {
        $invId = (int) $_POST['inventario_id'];
        $cantidad = (int) $_POST['cantidad_agregar'];

        if ($cantidad > 0) {
            $stmtReab = $pdo->prepare("
                UPDATE inventario_medicamentos 
                SET stock_actual = stock_actual + ? 
                WHERE id = ?
            ");
            $stmtReab->execute([$cantidad, $invId]);
            $mensaje = "Se reabastecieron {$cantidad} unidades exitosamente.";
        }
    }
}

// OBTENER ESTADÍSTICAS DEL DASHBOARD
$totalPacientes = (int) $pdo->query("SELECT COUNT(*) FROM pacientes_detalle WHERE estado_automata != 'ALTA_APROBADA'")->fetchColumn();
$totalMedicos = (int) $pdo->query("SELECT COUNT(*) FROM medicos_detalle")->fetchColumn();
$altasPendientesCount = (int) $pdo->query("SELECT COUNT(*) FROM solicitudes_alta WHERE estado = 'PENDIENTE'")->fetchColumn();
$medsBajoStockCount = (int) $pdo->query("
    SELECT COUNT(*) FROM inventario_medicamentos inv 
    JOIN medicamentos med ON inv.medicamento_id = med.id 
    WHERE inv.stock_actual <= med.stock_minimo
")->fetchColumn();

// LISTADO DE SOLICITUDES DE ALTA PENDIENTES
$stmtAltas = $pdo->query("
    SELECT s.*, p.numero_cama, p.diagnostico_ingreso, u_pac.nombre_completo AS paciente_nombre, u_med.nombre_completo AS medico_nombre
    FROM solicitudes_alta s
    JOIN pacientes_detalle p ON s.paciente_id = p.id
    JOIN usuarios u_pac ON p.usuario_id = u_pac.id
    JOIN usuarios u_med ON s.medico_solicitante_id = u_med.id
    WHERE s.estado = 'PENDIENTE'
    ORDER BY s.fecha_solicitud ASC
");
$solicitudesPendientes = $stmtAltas->fetchAll();

// LISTADO DE INVENTARIO
$stmtInv = $pdo->query("
    SELECT inv.*, med.codigo, med.nombre_comercial, med.principio_activo, med.presentacion, med.stock_minimo
    FROM inventario_medicamentos inv
    JOIN medicamentos med ON inv.medicamento_id = med.id
    ORDER BY inv.stock_actual ASC
");
$inventario = $stmtInv->fetchAll();

// LISTADO DE PACIENTES ACTIVOS
$stmtPacientes = $pdo->query("
    SELECT p.*, u.nombre_completo, u.rut_dni, u_med.nombre_completo as medico_nombre
    FROM pacientes_detalle p
    JOIN usuarios u ON p.usuario_id = u.id
    LEFT JOIN usuarios u_med ON p.medico_asignado_id = u_med.id
    WHERE p.estado_automata != 'ALTA_APROBADA'
    ORDER BY p.numero_cama ASC
");
$pacientesActivos = $stmtPacientes->fetchAll();
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HospitaLogix - Panel Administrador</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <style>
        .sidebar { width: 260px; min-height: 100vh; }
        .tabular-nums { font-variant-numeric: tabular-nums; }
    </style>
</head>
<body class="bg-light">

<div class="d-flex">
    <!-- BARRA LATERAL -->
    <div class="sidebar bg-white border-end p-3 d-flex flex-column">
        <div class="d-flex align-items-center mb-4 pb-3 border-bottom">
            <i class="bi bi-hospital fs-4 text-primary me-2"></i>
            <div>
                <h6 class="mb-0 fw-bold">HospitaLogix</h6>
                <small class="text-muted">Dirección & Administración</small>
            </div>
        </div>

        <ul class="nav nav-pills flex-column mb-auto">
            <li class="nav-item">
                <a href="#stats" class="nav-link active"><i class="bi bi-speedometer2 me-2"></i> Dashboard</a>
            </li>
            <li class="nav-item">
                <a href="#altas" class="nav-link text-dark"><i class="bi bi-check2-circle me-2"></i> Solicitudes de Alta <span class="badge bg-danger ms-auto"><?= $altasPendientesCount ?></span></a>
            </li>
            <li class="nav-item">
                <a href="#inventario" class="nav-link text-dark"><i class="bi bi-capsule me-2"></i> Farmacia e Inventario</a>
            </li>
            <li class="nav-item">
                <a href="#pacientes" class="nav-link text-dark"><i class="bi bi-people me-2"></i> Camas y Pacientes</a>
            </li>
            <li class="nav-item">
                <a href="/backend-php/agenda/calendario.php" class="nav-link text-dark"><i class="bi bi-calendar3 me-2"></i> Agenda General</a>
            </li>
        </ul>

        <div class="border-top pt-3">
            <div class="d-flex align-items-center mb-2">
                <i class="bi bi-person-circle fs-4 text-secondary me-2"></i>
                <div class="overflow-hidden">
                    <p class="mb-0 text-sm fw-semibold text-truncate"><?= htmlspecialchars($_SESSION['nombre_completo']) ?></p>
                    <small class="text-muted">Administrador</small>
                </div>
            </div>
            <a href="/backend-php/auth/logout.php" class="btn btn-outline-danger btn-sm w-100"><i class="bi bi-box-arrow-right me-1"></i> Cerrar Sesión</a>
        </div>
    </div>

    <!-- CONTENIDO PRINCIPAL -->
    <div class="flex-grow-1 p-4 overflow-auto" style="height: 100vh;">
        <header class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h3 class="fw-bold mb-1">Sala de Post-Urgencias</h3>
                <nav aria-label="breadcrumb">
                    <ol class="breadcrumb mb-0 text-muted small">
                        <li class="breadcrumb-item">Hospital Clínico Central</li>
                        <li class="breadcrumb-item active">Panel de Control</li>
                    </ol>
                </nav>
            </div>
            <span class="badge bg-light text-dark border p-2"><i class="bi bi-clock me-1"></i> <?= date('d/m/Y H:i') ?></span>
        </header>

        <?php if ($mensaje): ?>
            <div class="alert alert-success alert-dismissible fade show"><?= htmlspecialchars($mensaje) ?></div>
        <?php endif; ?>
        <?php if ($error): ?>
            <div class="alert alert-danger alert-dismissible fade show"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>

        <!-- KPIS -->
        <div class="row g-3 mb-4" id="stats">
            <div class="col-md-3">
                <div class="card border-0 shadow-sm p-3">
                    <small class="text-muted fw-semibold">Pacientes en Observación</small>
                    <h2 class="fw-bold my-1 text-primary tabular-nums"><?= $totalPacientes ?></h2>
                    <small class="text-muted">Ocupación post-urgencias</small>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card border-0 shadow-sm p-3">
                    <small class="text-muted fw-semibold">Médicos en Turno</small>
                    <h2 class="fw-bold my-1 text-dark tabular-nums"><?= $totalMedicos ?></h2>
                    <small class="text-muted">Especialistas activos</small>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card border-0 shadow-sm p-3">
                    <small class="text-muted fw-semibold">Altas Pendientes</small>
                    <h2 class="fw-bold my-1 text-warning tabular-nums"><?= $altasPendientesCount ?></h2>
                    <small class="text-muted">Requieren aprobación</small>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card border-0 shadow-sm p-3">
                    <small class="text-muted fw-semibold">Fármacos en Alerta</small>
                    <h2 class="fw-bold my-1 text-danger tabular-nums"><?= $medsBajoStockCount ?></h2>
                    <small class="text-muted">Stock igual o bajo mínimo</small>
                </div>
            </div>
        </div>

        <!-- SECCIÓN 1: SOLICITUDES DE ALTA MÉDICA -->
        <div class="card border-0 shadow-sm mb-4" id="altas">
            <div class="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                <h5 class="fw-bold mb-0"><i class="bi bi-shield-check text-success me-2"></i>Aprobación de Altas Médicas</h5>
                <span class="badge bg-secondary"><?= count($solicitudesPendientes) ?> pendientes</span>
            </div>
            <div class="card-body p-0">
                <?php if (empty($solicitudesPendientes)): ?>
                    <div class="p-4 text-center text-muted">
                        <i class="bi bi-check-all fs-1 text-success mb-2 d-block"></i>
                        No hay solicitudes de alta pendientes de revisión.
                    </div>
                <?php else: ?>
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th>Cama / Paciente</th>
                                    <th>Médico Solicitante</th>
                                    <th>Resumen Clínico</th>
                                    <th>Criterios Cumplidos</th>
                                    <th>Acción Administrativa</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($solicitudesPendientes as $sol): ?>
                                    <tr>
                                        <td>
                                            <span class="badge bg-primary me-1"><?= htmlspecialchars($sol['numero_cama']) ?></span>
                                            <strong><?= htmlspecialchars($sol['paciente_nombre']) ?></strong>
                                        </td>
                                        <td><?= htmlspecialchars($sol['medico_nombre']) ?></td>
                                        <td><small class="text-muted"><?= htmlspecialchars($sol['resumen_clinico']) ?></small></td>
                                        <td><span class="badge bg-light text-dark border"><?= htmlspecialchars($sol['criterios_cumplidos']) ?></span></td>
                                        <td>
                                            <form method="POST" class="d-flex gap-2">
                                                <input type="hidden" name="csrf_token" value="<?= obtenerCsrfToken() ?>">
                                                <input type="hidden" name="solicitud_id" value="<?= $sol['id'] ?>">
                                                <input type="hidden" name="paciente_id" value="<?= $sol['paciente_id'] ?>">
                                                <input type="text" name="motivo_resolucion" class="form-control form-control-sm" placeholder="Observación" style="width: 140px;">
                                                <button type="submit" name="accion_alta" value="aprobar" class="btn btn-success btn-sm"><i class="bi bi-check"></i> Aprobar</button>
                                                <button type="submit" name="accion_alta" value="rechazar" class="btn btn-outline-danger btn-sm"><i class="bi bi-x"></i> Observar</button>
                                            </form>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                <?php endif; ?>
            </div>
        </div>

        <!-- SECCIÓN 2: INVENTARIO DE MEDICAMENTOS -->
        <div class="card border-0 shadow-sm mb-4" id="inventario">
            <div class="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                <h5 class="fw-bold mb-0"><i class="bi bi-boxes text-primary me-2"></i>Control de Farmacia e Inventario Post-Urgencias</h5>
                <span class="text-muted small">Prevención estricta de stock negativo</span>
            </div>
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead class="table-light">
                        <tr>
                            <th>Código</th>
                            <th>Fármaco / Presentación</th>
                            <th>Lote / Vencimiento</th>
                            <th class="text-center">Stock Actual</th>
                            <th class="text-center">Deseado</th>
                            <th class="text-center">Utilizado</th>
                            <th>Estado</th>
                            <th>Reabastecer</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($inventario as $inv): 
                            $isAgotado = (int)$inv['stock_actual'] === 0;
                            $isBajo = (int)$inv['stock_actual'] <= (int)$inv['stock_minimo'];
                        ?>
                            <tr>
                                <td><code><?= htmlspecialchars($inv['codigo']) ?></code></td>
                                <td>
                                    <strong><?= htmlspecialchars($inv['nombre_comercial']) ?></strong>
                                    <div class="small text-muted"><?= htmlspecialchars($inv['principio_activo']) ?> - <?= htmlspecialchars($inv['presentacion']) ?></div>
                                </td>
                                <td>
                                    <small><?= htmlspecialchars($inv['lote']) ?></small>
                                    <div class="small text-muted">Vence: <?= htmlspecialchars($inv['fecha_vencimiento']) ?></div>
                                </td>
                                <td class="text-center fw-bold tabular-nums <?= $isAgotado ? 'text-danger' : ($isBajo ? 'text-warning' : 'text-success') ?>">
                                    <?= $inv['stock_actual'] ?>
                                </td>
                                <td class="text-center tabular-nums text-muted"><?= $inv['cantidad_deseada'] ?></td>
                                <td class="text-center tabular-nums text-muted"><?= $inv['cantidad_utilizada'] ?></td>
                                <td>
                                    <?php if ($isAgotado): ?>
                                        <span class="badge bg-danger">Agotado</span>
                                    <?php elseif ($isBajo): ?>
                                        <span class="badge bg-warning text-dark">Stock Bajo</span>
                                    <?php else: ?>
                                        <span class="badge bg-success">Disponible</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <form method="POST" class="d-flex gap-1">
                                        <input type="hidden" name="csrf_token" value="<?= obtenerCsrfToken() ?>">
                                        <input type="hidden" name="inventario_id" value="<?= $inv['id'] ?>">
                                        <input type="hidden" name="accion_reabastecer" value="1">
                                        <input type="number" name="cantidad_agregar" class="form-control form-control-sm text-center" value="20" min="1" max="500" style="width: 70px;">
                                        <button type="submit" class="btn btn-outline-primary btn-sm"><i class="bi bi-plus-lg"></i></button>
                                    </form>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>

    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
