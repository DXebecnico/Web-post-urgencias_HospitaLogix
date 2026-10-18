<?php
/**
 * HospitaLogix - Middleware de Seguridad y Control de Acceso
 * Archivo: backend-php/auth/middleware.php
 * Verificación de sesiones activas, roles de usuario y tokens CSRF
 */

declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    // Configuración segura de cookies de sesión
    ini_set('session.cookie_httponly', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.cookie_samesite', 'Lax');
    session_start();
}

/**
 * Constantes de Roles Hospitalarios
 */
define('ROL_ADMIN', 1);
define('ROL_MEDICO', 2);
define('ROL_PACIENTE', 3);

/**
 * Genera o retorna el token CSRF para formularios
 */
function obtenerCsrfToken(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * Valida el token CSRF recibido por POST
 */
function validarCsrfToken(?string $token): bool {
    if (!$token || empty($_SESSION['csrf_token'])) {
        return false;
    }
    return hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * Guardia de ruta: Requiere que el usuario esté autenticado y pertenezca a los roles permitidos
 * @param int[] $rolesPermitidos Array con los IDs de roles autorizados
 */
function verificarAcceso(array $rolesPermitidos): void {
    if (!isset($_SESSION['usuario_id']) || !isset($_SESSION['rol_id'])) {
        header('Location: /backend-php/auth/login.php?error=sesion_expirada');
        exit;
    }

    $rolActual = (int) $_SESSION['rol_id'];

    if (!in_array($rolActual, $rolesPermitidos, true)) {
        http_response_code(403);
        // Redirigir al panel correspondiente a su rol actual
        redirigirSegunRol($rolActual);
        exit;
    }
}

/**
 * Redirecciona al usuario a su panel correspondiente según rol_id
 */
function redirigirSegunRol(int $rolId): void {
    switch ($rolId) {
        case ROL_ADMIN:
            header('Location: /backend-php/admin/dashboard.php');
            break;
        case ROL_MEDICO:
            header('Location: /backend-php/medico/dashboard.php');
            break;
        case ROL_PACIENTE:
            header('Location: /backend-php/paciente/dashboard.php');
            break;
        default:
            header('Location: /backend-php/auth/login.php?error=rol_invalido');
            break;
    }
    exit;
}
