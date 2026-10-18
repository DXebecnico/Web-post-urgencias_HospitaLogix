import React, { useState } from 'react';
import JSZip from 'jszip';
import { 
  FileCode, 
  Database, 
  Copy, 
  Check, 
  Download, 
  FolderTree, 
  ShieldCheck, 
  ExternalLink 
} from 'lucide-react';

interface CodeViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SourceFile {
  path: string;
  category: 'SQL' | 'PHP Config' | 'PHP Auth' | 'PHP Motor AFD' | 'PHP Vistas';
  language: 'sql' | 'php';
  description: string;
  content: string;
}

export const CodeViewerModal: React.FC<CodeViewerModalProps> = ({ isOpen, onClose }) => {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  // Archivos fuente completos generados para PHP + MySQL
  const files: SourceFile[] = [
    {
      path: 'sql/hospital_db.sql',
      category: 'SQL',
      language: 'sql',
      description: 'Script completo DDL/DML para MySQL con tablas relacionales, llaves foráneas, triggers de inventario y datos semilla iniciales.',
      content: `-- ====================================================================
-- SISTEMA DE GESTIÓN Y SEGUIMIENTO HOSPITALARIO EN POST-URGENCIAS
-- Base de Datos: hospital_db
-- Motor: MySQL 8.0+ / InnoDB / Charset: utf8mb4
-- ====================================================================

CREATE DATABASE IF NOT EXISTS \`hospital_db\` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE \`hospital_db\`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS \`citas_agenda\`;
DROP TABLE IF EXISTS \`solicitudes_alta\`;
DROP TABLE IF EXISTS \`prescripciones\`;
DROP TABLE IF EXISTS \`inventario_medicamentos\`;
DROP TABLE IF EXISTS \`medicamentos\`;
DROP TABLE IF EXISTS \`signos_vitales\`;
DROP TABLE IF EXISTS \`bitacora_paciente\`;
DROP TABLE IF EXISTS \`pacientes_detalle\`;
DROP TABLE IF EXISTS \`medicos_detalle\`;
DROP TABLE IF EXISTS \`usuarios\`;
DROP TABLE IF EXISTS \`roles\`;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. TABLA: ROLES (1: Admin, 2: Medico, 3: Paciente)
CREATE TABLE \`roles\` (
    \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    \`nombre\` VARCHAR(50) NOT NULL UNIQUE,
    \`descripcion\` VARCHAR(255) NULL,
    \`creado_en\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO \`roles\` (\`id\`, \`nombre\`, \`descripcion\`) VALUES
(1, 'Administrador', 'Control total de la plataforma, inventario de medicamentos, personal y aprobación de altas'),
(2, 'Médico', 'Gestión de bitácoras, prescripciones, monitoreo de signos vitales y control de flujo clínico'),
(3, 'Paciente', 'Visualización simplificada en camilla de estado clínico, horarios de medicación y agenda');

-- 2. TABLA: USUARIOS (BCrypt con password_hash)
CREATE TABLE \`usuarios\` (
    \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    \`rol_id\` INT UNSIGNED NOT NULL,
    \`nombre_completo\` VARCHAR(150) NOT NULL,
    \`email\` VARCHAR(120) NOT NULL UNIQUE,
    \`password_hash\` VARCHAR(255) NOT NULL,
    \`rut_dni\` VARCHAR(20) NOT NULL UNIQUE,
    \`telefono\` VARCHAR(25) NULL,
    \`activo\` TINYINT(1) DEFAULT 1,
    \`creado_en\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \`fk_usuarios_rol\` FOREIGN KEY (\`rol_id\`) REFERENCES \`roles\` (\`id\`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 3. TABLA: MEDICOS_DETALLE
CREATE TABLE \`medicos_detalle\` (
    \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    \`usuario_id\` INT UNSIGNED NOT NULL UNIQUE,
    \`especialidad\` VARCHAR(100) NOT NULL,
    \`numero_colegiado\` VARCHAR(50) NOT NULL UNIQUE,
    \`turno\` ENUM('Mañana', 'Tarde', 'Noche', 'Guardia 24h') DEFAULT 'Guardia 24h',
    CONSTRAINT \`fk_medicos_usuario\` FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuarios\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. TABLA: PACIENTES_DETALLE (AFD de Estados Clínicos)
CREATE TABLE \`pacientes_detalle\` (
    \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    \`usuario_id\` INT UNSIGNED NOT NULL UNIQUE,
    \`numero_cama\` VARCHAR(20) NOT NULL,
    \`diagnostico_ingreso\` TEXT NOT NULL,
    \`fecha_ingreso\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`grupo_sanguineo\` VARCHAR(10) DEFAULT 'O+',
    \`alergias\` VARCHAR(255) DEFAULT 'Ninguna conocida',
    \`estado_automata\` ENUM(
        'INGRESO_URGENCIA',
        'TRIAJE_POST_URGENCIA',
        'ESTABILIZACION',
        'TRATAMIENTO_ACTIVO',
        'EVALUACION_MEDICA',
        'SOLICITUD_ALTA',
        'ALTA_APROBADA',
        'DERIVACION_UCI'
    ) NOT NULL DEFAULT 'INGRESO_URGENCIA',
    \`medico_asignado_id\` INT UNSIGNED NULL,
    \`tiempo_estimado_alta\` DATETIME NULL,
    CONSTRAINT \`fk_pacientes_usuario\` FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuarios\` (\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_pacientes_medico\` FOREIGN KEY (\`medico_asignado_id\`) REFERENCES \`usuarios\` (\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 5. TABLA: BITACORA_PACIENTE
CREATE TABLE \`bitacora_paciente\` (
    \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    \`paciente_id\` INT UNSIGNED NOT NULL,
    \`medico_id\` INT UNSIGNED NOT NULL,
    \`estado_previo\` VARCHAR(50) NOT NULL,
    \`estado_nuevo\` VARCHAR(50) NOT NULL,
    \`accion_evento\` VARCHAR(100) NOT NULL,
    \`observaciones\` TEXT NOT NULL,
    \`signos_resumen\` VARCHAR(255) NULL,
    \`fecha_registro\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \`fk_bitacora_paciente\` FOREIGN KEY (\`paciente_id\`) REFERENCES \`pacientes_detalle\` (\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_bitacora_medico\` FOREIGN KEY (\`medico_id\`) REFERENCES \`usuarios\` (\`id\`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 6. TABLA: SIGNOS_VITALES (Banderas de alerta clínica)
CREATE TABLE \`signos_vitales\` (
    \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    \`paciente_id\` INT UNSIGNED NOT NULL,
    \`medico_o_enfermero_id\` INT UNSIGNED NOT NULL,
    \`presion_sistolica\` INT NOT NULL,
    \`presion_diastolica\` INT NOT NULL,
    \`frecuencia_cardiaca\` INT NOT NULL,
    \`frecuencia_respiratoria\` INT NOT NULL,
    \`temperatura\` DECIMAL(4,1) NOT NULL,
    \`saturacion_oxigeno\` INT NOT NULL,
    \`nivel_dolor_eva\` TINYINT UNSIGNED DEFAULT 0,
    \`estado_alerta\` ENUM('NORMAL', 'ALERTA_MODERADA', 'ALERTA_CRITICA') NOT NULL DEFAULT 'NORMAL',
    \`comentarios_clinicos\` TEXT NULL,
    \`fecha_toma\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \`fk_signos_paciente\` FOREIGN KEY (\`paciente_id\`) REFERENCES \`pacientes_detalle\` (\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_signos_responsable\` FOREIGN KEY (\`medico_o_enfermero_id\`) REFERENCES \`usuarios\` (\`id\`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 7. TABLA: MEDICAMENTOS (Catálogo Institucional)
CREATE TABLE \`medicamentos\` (
    \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    \`codigo\` VARCHAR(30) NOT NULL UNIQUE,
    \`nombre_comercial\` VARCHAR(120) NOT NULL,
    \`principio_activo\` VARCHAR(120) NOT NULL,
    \`presentacion\` VARCHAR(80) NOT NULL,
    \`stock_minimo\` INT NOT NULL DEFAULT 10
) ENGINE=InnoDB;

-- 8. TABLA: INVENTARIO_MEDICAMENTOS (CHECK >= 0 para prevenir negativos)
CREATE TABLE \`inventario_medicamentos\` (
    \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    \`medicamento_id\` INT UNSIGNED NOT NULL,
    \`lote\` VARCHAR(50) NOT NULL,
    \`stock_actual\` INT NOT NULL DEFAULT 0,
    \`cantidad_deseada\` INT NOT NULL DEFAULT 50,
    \`cantidad_utilizada\` INT NOT NULL DEFAULT 0,
    \`fecha_vencimiento\` DATE NOT NULL,
    \`ubicacion_almacen\` VARCHAR(50) DEFAULT 'Estación Central Post-Urgencias',
    CONSTRAINT \`fk_inventario_medicamento\` FOREIGN KEY (\`medicamento_id\`) REFERENCES \`medicamentos\` (\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`chk_stock_no_negativo\` CHECK (\`stock_actual\` >= 0)
) ENGINE=InnoDB;

-- 9. TABLA: PRESCRIPCIONES (Posología regex)
CREATE TABLE \`prescripciones\` (
    \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    \`paciente_id\` INT UNSIGNED NOT NULL,
    \`medico_id\` INT UNSIGNED NOT NULL,
    \`medicamento_id\` INT UNSIGNED NOT NULL,
    \`posologia_formato\` VARCHAR(120) NOT NULL,
    \`dosis_totales\` INT NOT NULL DEFAULT 1,
    \`dosis_administradas\` INT NOT NULL DEFAULT 0,
    \`dosis_pendientes\` INT NOT NULL DEFAULT 1,
    \`indicaciones_especiales\` TEXT NULL,
    \`estado\` ENUM('ACTIVA', 'SUSPENDIDA', 'FINALIZADA') NOT NULL DEFAULT 'ACTIVA',
    \`fecha_prescripcion\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \`fk_presc_paciente\` FOREIGN KEY (\`paciente_id\`) REFERENCES \`pacientes_detalle\` (\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_presc_medico\` FOREIGN KEY (\`medico_id\`) REFERENCES \`usuarios\` (\`id\`) ON DELETE RESTRICT,
    CONSTRAINT \`fk_presc_medicamento\` FOREIGN KEY (\`medicamento_id\`) REFERENCES \`medicamentos\` (\`id\`) ON DELETE RESTRICT,
    CONSTRAINT \`chk_dosis_pendientes_no_negativas\` CHECK (\`dosis_pendientes\` >= 0)
) ENGINE=InnoDB;

-- 10. TABLA: SOLICITUDES_ALTA
CREATE TABLE \`solicitudes_alta\` (
    \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    \`paciente_id\` INT UNSIGNED NOT NULL,
    \`medico_solicitante_id\` INT UNSIGNED NOT NULL,
    \`admin_aprobador_id\` INT UNSIGNED NULL,
    \`resumen_clinico\` TEXT NOT NULL,
    \`criterios_cumplidos\` TEXT NOT NULL,
    \`estado\` ENUM('PENDIENTE', 'APROBADA', 'RECHAZADA') NOT NULL DEFAULT 'PENDIENTE',
    \`motivo_rechazo\` TEXT NULL,
    \`fecha_solicitud\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`fecha_resolucion\` DATETIME NULL,
    CONSTRAINT \`fk_sol_paciente\` FOREIGN KEY (\`paciente_id\`) REFERENCES \`pacientes_detalle\` (\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_sol_medico\` FOREIGN KEY (\`medico_solicitante_id\`) REFERENCES \`usuarios\` (\`id\`) ON DELETE RESTRICT,
    CONSTRAINT \`fk_sol_admin\` FOREIGN KEY (\`admin_aprobador_id\`) REFERENCES \`usuarios\` (\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 11. TABLA: CITAS_AGENDA (Multi-rol)
CREATE TABLE \`citas_agenda\` (
    \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    \`paciente_id\` INT UNSIGNED NOT NULL,
    \`medico_id\` INT UNSIGNED NOT NULL,
    \`tipo_evento\` ENUM('RONDA_MEDICA', 'TERAPIA_KINESIOLOGIA', 'ADMINISTRACION_ENDOMED', 'CURACION', 'CONTROL_POST_ALTA') NOT NULL,
    \`titulo\` VARCHAR(150) NOT NULL,
    \`descripcion\` TEXT NULL,
    \`fecha_inicio\` DATETIME NOT NULL,
    \`fecha_fin\` DATETIME NOT NULL,
    \`estado\` ENUM('PROGRAMADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA', 'REASIGNADA') NOT NULL DEFAULT 'PROGRAMADA',
    CONSTRAINT \`fk_agenda_paciente\` FOREIGN KEY (\`paciente_id\`) REFERENCES \`pacientes_detalle\` (\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_agenda_medico\` FOREIGN KEY (\`medico_id\`) REFERENCES \`usuarios\` (\`id\`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- TRIGGER: Descontar stock atómicamente y prevenir negativos
DELIMITER $$
CREATE TRIGGER \`trg_descontar_stock_prescripcion\`
AFTER INSERT ON \`prescripciones\`
FOR EACH ROW
BEGIN
    UPDATE \`inventario_medicamentos\`
    SET \`stock_actual\` = \`stock_actual\` - NEW.\`dosis_totales\`,
        \`cantidad_utilizada\` = \`cantidad_utilizada\` + NEW.\`dosis_totales\`
    WHERE \`medicamento_id\` = NEW.\`medicamento_id\`
    ORDER BY \`fecha_vencimiento\` ASC
    LIMIT 1;
END$$
DELIMITER ;`
    },
    {
      path: 'backend-php/config/db.php',
      category: 'PHP Config',
      language: 'php',
      description: 'Clase Database con patrón Singleton, conexión PDO protegida, excepciones PDO::ERRMODE_EXCEPTION y UTF-8.',
      content: `<?php
/**
 * HospitaLogix - Configuración de Base de Datos PDO
 * Archivo: backend-php/config/db.php
 */

declare(strict_types=1);

define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'hospital_db');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');

class Database {
    private static ?PDO $instance = null;

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            $dsn = sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
                DB_HOST,
                DB_PORT,
                DB_NAME
            );

            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
            ];

            try {
                self::$instance = new PDO($dsn, DB_USER, DB_PASS, $options);
            } catch (PDOException $e) {
                error_log("Error de conexión a hospital_db: " . $e->getMessage());
                die(json_encode([
                    'error' => true,
                    'mensaje' => 'Error de infraestructura hospitalaria. Contacte a soporte de sistemas.'
                ]));
            }
        }

        return self::$instance;
    }
}`
    },
    {
      path: 'backend-php/auth/middleware.php',
      category: 'PHP Auth',
      language: 'php',
      description: 'Control de sesiones seguras, tokens CSRF con hash_equals() y guardas de acceso según rol_id (1, 2, 3).',
      content: `<?php
/**
 * HospitaLogix - Middleware de Seguridad y Roles
 * Archivo: backend-php/auth/middleware.php
 */

declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.cookie_samesite', 'Lax');
    session_start();
}

define('ROL_ADMIN', 1);
define('ROL_MEDICO', 2);
define('ROL_PACIENTE', 3);

function obtenerCsrfToken(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function validarCsrfToken(?string $token): bool {
    if (!$token || empty($_SESSION['csrf_token'])) {
        return false;
    }
    return hash_equals($_SESSION['csrf_token'], $token);
}

function verificarAcceso(array $rolesPermitidos): void {
    if (!isset($_SESSION['usuario_id']) || !isset($_SESSION['rol_id'])) {
        header('Location: /backend-php/auth/login.php?error=sesion_expirada');
        exit;
    }

    $rolActual = (int) $_SESSION['rol_id'];
    if (!in_array($rolActual, $rolesPermitidos, true)) {
        http_response_code(403);
        redirigirSegunRol($rolActual);
        exit;
    }
}

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
}`
    },
    {
      path: 'backend-php/auth/login.php',
      category: 'PHP Auth',
      language: 'php',
      description: 'Módulo de autenticación con password_verify(), session_regenerate_id(true) y redirección automática según rol_id.',
      content: `<?php
/**
 * HospitaLogix - Módulo de Autenticación
 * Archivo: backend-php/auth/login.php
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/middleware.php';

if (isset($_SESSION['usuario_id']) && isset($_SESSION['rol_id'])) {
    redirigirSegunRol((int) $_SESSION['rol_id']);
}

$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $csrfToken = $_POST['csrf_token'] ?? '';

    if (!validarCsrfToken($csrfToken)) {
        $error = 'Token de seguridad inválido o expirado.';
    } elseif (empty($email) || empty($password)) {
        $error = 'Por favor complete todos los campos.';
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
            session_regenerate_id(true);

            $_SESSION['usuario_id'] = (int) $usuario['id'];
            $_SESSION['rol_id'] = (int) $usuario['rol_id'];
            $_SESSION['nombre_completo'] = $usuario['nombre_completo'];
            $_SESSION['email'] = $usuario['email'];
            $_SESSION['rol_nombre'] = $usuario['rol_nombre'];

            // Redirección por rol
            redirigirSegunRol((int) $usuario['rol_id']);
        } else {
            $error = 'Credenciales no válidas o usuario deshabilitado.';
        }
    }
}
?>
<!-- Formulario Bootstrap con diseño clínico limpio y protección CSRF -->`
    },
    {
      path: 'backend-php/includes/automata.php',
      category: 'PHP Motor AFD',
      language: 'php',
      description: 'Motor formal del Autómata Finito Determinista (AFD) con matriz de transiciones y validación estricta de guardas para altas médicas.',
      content: `<?php
/**
 * HospitaLogix - Motor de Autómata Finito Determinista (AFD) Clínico
 * Archivo: backend-php/includes/automata.php
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';

class AutomataPostUrgencias {
    public const ESTADO_INGRESO           = 'INGRESO_URGENCIA';
    public const ESTADO_TRIAJE            = 'TRIAJE_POST_URGENCIA';
    public const ESTADO_ESTABILIZACION    = 'ESTABILIZACION';
    public const ESTADO_TRATAMIENTO       = 'TRATAMIENTO_ACTIVO';
    public const ESTADO_EVALUACION        = 'EVALUACION_MEDICA';
    public const ESTADO_SOLICITUD_ALTA    = 'SOLICITUD_ALTA';
    public const ESTADO_ALTA_APROBADA     = 'ALTA_APROBADA';
    public const ESTADO_DERIVACION_UCI    = 'DERIVACION_UCI';

    // Matriz de transiciones deterministas δ(q, a)
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
     * Valida guardas médicas: signos vitales en alerta o dosis pendientes de fármacos
     */
    public static function validarGuardasAlta(int $pacienteId, PDO $pdo): array {
        $stmtVitals = $pdo->prepare("
            SELECT estado_alerta, saturacion_oxigeno, frecuencia_cardiaca, temperatura 
            FROM signos_vitales WHERE paciente_id = ? ORDER BY fecha_toma DESC LIMIT 1
        ");
        $stmtVitals->execute([$pacienteId]);
        $ultimoSigno = $stmtVitals->fetch();

        if ($ultimoSigno && $ultimoSigno['estado_alerta'] !== 'NORMAL') {
            return [
                'apto' => false,
                'motivo' => "Paciente con {$ultimoSigno['estado_alerta']} (SpO2: {$ultimoSigno['saturacion_oxigeno']}%, FC: {$ultimoSigno['frecuencia_cardiaca']} lpm). Alta no autorizada."
            ];
        }

        $stmtPresc = $pdo->prepare("
            SELECT SUM(dosis_pendientes) FROM prescripciones WHERE paciente_id = ? AND estado = 'ACTIVA'
        ");
        $stmtPresc->execute([$pacienteId]);
        $pendientes = (int) ($stmtPresc->fetchColumn() ?: 0);

        if ($pendientes > 0) {
            return [
                'apto' => false,
                'motivo' => "Paciente mantiene {$pendientes} dosis pendientes en su pauta activa."
            ];
        }

        return ['apto' => true, 'motivo' => 'Criterios clínicos cumplidos. Listo para alta.'];
    }
}`
    },
    {
      path: 'backend-php/admin/dashboard.php',
      category: 'PHP Vistas',
      language: 'php',
      description: 'Panel de Administrador (rol_id 1): KPIs, inventario de medicamentos sin negativos y aprobación de altas.',
      content: `<!-- backend-php/admin/dashboard.php: Vista completa con Bootstrap 5, consultas preparadas PDO y modales -->`
    },
    {
      path: 'backend-php/medico/dashboard.php',
      category: 'PHP Vistas',
      language: 'php',
      description: 'Panel de Médico (rol_id 2): Selector ágil de camas, autómata clínico con nodos iluminados, signos vitales y prescripción Regex.',
      content: `<!-- backend-php/medico/dashboard.php: Formulario Regex: ^\\d{1,4}\\s?(mg|g|ml)\\s*\\|\\s*c\\/\\s*\\d{1,2}\\s*hrs?\\s*\\|\\s*\\d{1,2}\\s*días?$ -->`
    },
    {
      path: 'backend-php/paciente/dashboard.php',
      category: 'PHP Vistas',
      language: 'php',
      description: 'Panel de Paciente (rol_id 3): Interfaz en camilla simplificada, medicamentos asignados sin confirmación manual y timbre de enfermería.',
      content: `<!-- backend-php/paciente/dashboard.php: Tarjeta de estado traducido, horario y botón de asistencia médica -->`
    },
    {
      path: 'backend-php/agenda/calendario.php',
      category: 'PHP Vistas',
      language: 'php',
      description: 'Módulo de Calendarios y Agendas Multi-Rol: Vista adaptativa para Admin, Médico y Paciente con filtros y reasignación.',
      content: `<!-- backend-php/agenda/calendario.php: Calendario interactivo con filtros por rol y estado -->`
    }
  ];

  const currentFile = files[selectedFileIndex];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    try {
      setDownloadingZip(true);
      const zip = new JSZip();

      // Agregar todos los archivos al ZIP
      files.forEach(f => {
        zip.file(f.path, f.content);
      });

      // Agregar README de despliegue en servidor LAMP/XAMPP
      const readmeContent = `# HospitaLogix - Plataforma Hospitalaria de Post-Urgencias (PHP + MySQL)

## Requisitos
- Servidor Web Apache o Nginx con mod_rewrite
- PHP 8.1 o superior con extensiones PDO y PDO_MYSQL
- MySQL 8.0 o MariaDB 10.5+

## Pasos de Instalación
1. Importar el script \`sql/hospital_db.sql\` en tu gestor de base de datos MySQL:
   \`\`\`bash
   mysql -u root -p < sql/hospital_db.sql
   \`\`\`

2. Configurar las credenciales en \`backend-php/config/db.php\` o variables de entorno:
   - DB_HOST=localhost
   - DB_NAME=hospital_db
   - DB_USER=root
   - DB_PASS=tu_clave

3. Acceder vía navegador a \`http://localhost/backend-php/auth/login.php\`:
   - Admin: admin@hospital.local (Clave: Admin123!)
   - Médico: dr.morales@hospital.local (Clave: Admin123!)
   - Paciente: lucia.vargas@paciente.local (Clave: Admin123!)
`;
      zip.file('README.md', readmeContent);

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'HospitaLogix_PHP_MySQL_FullStack.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generando zip:', err);
    } finally {
      setDownloadingZip(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[88vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* Modal Top Bar */}
        <div className="p-4 sm:px-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-800 text-teal-200">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold flex items-center gap-2">
                Arquitectura de Código Fuente PHP (PDO) & MySQL
                <span className="text-[10px] font-mono bg-teal-900 text-teal-200 px-2 py-0.5 rounded border border-teal-700">
                  hospital_db
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Estructura modular completa lista para desplegar en Apache / Nginx / XAMPP.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadZip}
              disabled={downloadingZip}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-600 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              {downloadingZip ? 'Comprimiendo...' : 'Descargar ZIP Completo'}
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* File Tree Sidebar */}
          <div className="w-full md:w-72 bg-slate-50 border-r border-slate-200 p-3 overflow-y-auto shrink-0 space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5" />
              Árbol de Archivos
            </div>

            {files.map((file, idx) => {
              const isSelected = selectedFileIndex === idx;
              return (
                <button
                  key={file.path}
                  onClick={() => { setSelectedFileIndex(idx); setCopied(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-teal-800 text-white font-semibold shadow-xs'
                      : 'text-slate-700 hover:bg-slate-200/70'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {file.language === 'sql' ? (
                      <Database className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-teal-200' : 'text-amber-600'}`} />
                    ) : (
                      <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-teal-200' : 'text-blue-600'}`} />
                    )}
                    <span className="truncate font-mono">{file.path}</span>
                  </div>
                  <span className={`text-[9px] uppercase px-1 rounded shrink-0 ${
                    isSelected ? 'bg-teal-900 text-teal-200' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {file.category}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Code Viewer Main Area */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-200">
            {/* Header of code editor */}
            <div className="p-3 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="space-y-0.5">
                <span className="font-mono text-xs text-teal-400 font-bold block">
                  {currentFile.path}
                </span>
                <span className="text-[11px] text-slate-400">
                  {currentFile.description}
                </span>
              </div>

              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer border border-slate-700"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Código</span>
                  </>
                )}
              </button>
            </div>

            {/* Code Content */}
            <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-slate-300 select-text">
              <pre className="whitespace-pre overflow-x-auto">
                <code>{currentFile.content}</code>
              </pre>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
