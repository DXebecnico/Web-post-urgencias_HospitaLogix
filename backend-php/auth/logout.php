<?php
/**
 * HospitaLogix - Cierre de Sesión Seguro
 * Archivo: backend-php/auth/logout.php
 */

declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Vaciar datos de sesión
$_SESSION = [];

// Invalidar cookie de sesión en cliente
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(),
        '',
        time() - 42000,
        $params["path"],
        $params["domain"],
        $params["secure"],
        $params["httponly"]
    );
}

// Destruir sesión en el servidor
session_destroy();

header('Location: /backend-php/auth/login.php?mensaje=sesion_cerrada');
exit;
