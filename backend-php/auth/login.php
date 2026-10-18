<?php
/**
 * HospitaLogix - Módulo de Autenticación
 * Archivo: backend-php/auth/login.php
 * Login seguro con password_verify(), protección CSRF y redirección según rol_id (1, 2, 3)
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/middleware.php';

// Si ya tiene sesión activa, redirigir directo
if (isset($_SESSION['usuario_id']) && isset($_SESSION['rol_id'])) {
    redirigirSegunRol((int) $_SESSION['rol_id']);
}

$error = null;
$mensajeExito = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $csrfToken = $_POST['csrf_token'] ?? '';

    if (!validarCsrfToken($csrfToken)) {
        $error = 'Token de seguridad inválido o expirado. Por favor, recargue la página.';
    } elseif (empty($email) || empty($password)) {
        $error = 'Por favor complete su correo institucional y contraseña.';
    } else {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            SELECT u.id, u.rol_id, u.nombre_completo, u.email, u.password_hash, u.activo, r.nombre AS rol_nombre 
            FROM usuarios u 
            JOIN roles r ON u.rol_id = r.id 
            WHERE u.email = :email 
            LIMIT 1
        ");
        $stmt->execute([':email' => $email]);
        $usuario = $stmt->fetch();

        if ($usuario && (int)$usuario['activo'] === 1 && password_verify($password, $usuario['password_hash'])) {
            // Regenerar ID de sesión para prevenir Session Fixation
            session_regenerate_id(true);

            $_SESSION['usuario_id'] = (int) $usuario['id'];
            $_SESSION['rol_id'] = (int) $usuario['rol_id'];
            $_SESSION['nombre_completo'] = $usuario['nombre_completo'];
            $_SESSION['email'] = $usuario['email'];
            $_SESSION['rol_nombre'] = $usuario['rol_nombre'];
            $_SESSION['ultimo_acceso'] = time();

            // Redirección automática según el rol (1=Admin, 2=Médico, 3=Paciente)
            redirigirSegunRol((int) $usuario['rol_id']);
        } else {
            $error = 'Credenciales no válidas o usuario deshabilitado por el administrador.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HospitaLogix - Acceso a Plataforma Clínica</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
</head>
<body class="bg-light d-flex align-items-center min-vh-100">
<div class="container py-5">
    <div class="row justify-content-center">
        <div class="col-md-5 col-lg-4">
            <div class="card shadow-sm border-0 rounded-3">
                <div class="card-header bg-primary text-white text-center py-4 rounded-top-3">
                    <h4 class="mb-0 fw-bold"><i class="bi bi-hospital me-2"></i>HospitaLogix</h4>
                    <p class="small text-white-50 mb-0">Gestión de Post-Urgencias</p>
                </div>
                <div class="card-body p-4">
                    <?php if ($error): ?>
                        <div class="alert alert-danger alert-dismissible fade show text-sm py-2" role="alert">
                            <i class="bi bi-exclamation-triangle-fill me-1"></i> <?= htmlspecialchars($error) ?>
                        </div>
                    <?php endif; ?>

                    <form action="login.php" method="POST">
                        <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(obtenerCsrfToken()) ?>">

                        <div class="mb-3">
                            <label for="email" class="form-label text-secondary small fw-semibold">Correo Institucional</label>
                            <div class="input-group">
                                <span class="input-group-text bg-white"><i class="bi bi-envelope text-muted"></i></span>
                                <input type="email" class="form-control" id="email" name="email" required placeholder="ej: doctor@hospital.local" autofocus>
                            </div>
                        </div>

                        <div class="mb-3">
                            <label for="password" class="form-label text-secondary small fw-semibold">Contraseña</label>
                            <div class="input-group">
                                <span class="input-group-text bg-white"><i class="bi bi-lock text-muted"></i></span>
                                <input type="password" class="form-control" id="password" name="password" required placeholder="••••••••">
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary w-100 py-2 fw-semibold">
                            <i class="bi bi-box-arrow-in-right me-1"></i> Iniciar Sesión Segura
                        </button>
                    </form>

                    <hr class="my-4 text-muted">
                    <div class="small text-muted text-center">
                        <p class="mb-1"><strong>Cuentas demo (Clave: Admin123!):</strong></p>
                        <ul class="list-unstyled mb-0" style="font-size: 0.8rem;">
                            <li>Admin: <code>admin@hospital.local</code></li>
                            <li>Médico: <code>dr.morales@hospital.local</code></li>
                            <li>Paciente: <code>lucia.vargas@paciente.local</code></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
