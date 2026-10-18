-- ====================================================================
-- SISTEMA DE GESTIÓN Y SEGUIMIENTO HOSPITALARIO EN POST-URGENCIAS
-- Base de Datos: hospital_db
-- Motor: MySQL 8.0+ / InnoDB / Charset: utf8mb4
-- ====================================================================

CREATE DATABASE IF NOT EXISTS `hospital_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `hospital_db`;

-- Desactivar temporalmente revisión de foreign keys para inicialización limpia
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `citas_agenda`;
DROP TABLE IF EXISTS `solicitudes_alta`;
DROP TABLE IF EXISTS `prescripciones`;
DROP TABLE IF EXISTS `inventario_medicamentos`;
DROP TABLE IF EXISTS `medicamentos`;
DROP TABLE IF EXISTS `signos_vitales`;
DROP TABLE IF EXISTS `bitacora_paciente`;
DROP TABLE IF EXISTS `pacientes_detalle`;
DROP TABLE IF EXISTS `medicos_detalle`;
DROP TABLE IF EXISTS `usuarios`;
DROP TABLE IF EXISTS `roles`;

SET FOREIGN_KEY_CHECKS = 1;

-- --------------------------------------------------------------------
-- 1. TABLA: ROLES
-- Roles permitidos: 1: Administrador, 2: Médico, 3: Paciente
-- --------------------------------------------------------------------
CREATE TABLE `roles` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nombre` VARCHAR(50) NOT NULL UNIQUE,
    `descripcion` VARCHAR(255) NULL,
    `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO `roles` (`id`, `nombre`, `descripcion`) VALUES
(1, 'Administrador', 'Control total de la plataforma, inventario de medicamentos, personal y aprobación de altas'),
(2, 'Médico', 'Gestión de bitácoras, prescripciones, monitoreo de signos vitales y control de flujo clínico'),
(3, 'Paciente', 'Visualización simplificada en camilla de estado clínico, horarios de medicación y agenda');

-- --------------------------------------------------------------------
-- 2. TABLA: USUARIOS
-- Almacenamiento seguro de credenciales con password_hash (BCrypt)
-- --------------------------------------------------------------------
CREATE TABLE `usuarios` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `rol_id` INT UNSIGNED NOT NULL,
    `nombre_completo` VARCHAR(150) NOT NULL,
    `email` VARCHAR(120) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `rut_dni` VARCHAR(20) NOT NULL UNIQUE,
    `telefono` VARCHAR(25) NULL,
    `activo` TINYINT(1) DEFAULT 1,
    `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `actualizado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_usuarios_rol` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- 3. TABLA: MEDICOS_DETALLE
-- Perfil profesional de médicos de sala post-urgencias
-- --------------------------------------------------------------------
CREATE TABLE `medicos_detalle` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `usuario_id` INT UNSIGNED NOT NULL UNIQUE,
    `especialidad` VARCHAR(100) NOT NULL,
    `numero_colegiado` VARCHAR(50) NOT NULL UNIQUE,
    `turno` ENUM('Mañana', 'Tarde', 'Noche', 'Guardia 24h') DEFAULT 'Guardia 24h',
    CONSTRAINT `fk_medicos_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- 4. TABLA: PACIENTES_DETALLE
-- Paciente asignado a camilla de post-urgencia y estado de autómata
-- --------------------------------------------------------------------
CREATE TABLE `pacientes_detalle` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `usuario_id` INT UNSIGNED NOT NULL UNIQUE,
    `numero_cama` VARCHAR(20) NOT NULL,
    `diagnostico_ingreso` TEXT NOT NULL,
    `fecha_ingreso` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `grupo_sanguineo` VARCHAR(10) DEFAULT 'O+',
    `alergias` VARCHAR(255) DEFAULT 'Ninguna conocida',
    `estado_automata` ENUM(
        'q0',
        'q1',
        'q2',
        'q3',
        'q4',
        'q5'
    ) NOT NULL DEFAULT 'q2',
    `medico_asignado_id` INT UNSIGNED NULL,
    `tiempo_estimado_alta` DATETIME NULL,
    CONSTRAINT `fk_pacientes_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_pacientes_medico` FOREIGN KEY (`medico_asignado_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- 5. TABLA: BITACORA_PACIENTE (Historial del Autómata Finito Determinista)
-- --------------------------------------------------------------------
CREATE TABLE `bitacora_paciente` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `paciente_id` INT UNSIGNED NOT NULL,
    `medico_id` INT UNSIGNED NOT NULL,
    `estado_previo` VARCHAR(50) NOT NULL,
    `estado_nuevo` VARCHAR(50) NOT NULL,
    `accion_evento` VARCHAR(100) NOT NULL,
    `observaciones` TEXT NOT NULL,
    `signos_resumen` VARCHAR(255) NULL,
    `fecha_registro` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_bitacora_paciente` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes_detalle` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_bitacora_medico` FOREIGN KEY (`medico_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- 6. TABLA: SIGNOS_VITALES
-- Monitoreo paramétrico con banderas de alerta clínica
-- --------------------------------------------------------------------
CREATE TABLE `signos_vitales` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `paciente_id` INT UNSIGNED NOT NULL,
    `medico_o_enfermero_id` INT UNSIGNED NOT NULL,
    `presion_sistolica` INT NOT NULL,
    `presion_diastolica` INT NOT NULL,
    `frecuencia_cardiaca` INT NOT NULL,
    `frecuencia_respiratoria` INT NOT NULL,
    `temperatura` DECIMAL(4,1) NOT NULL,
    `saturacion_oxigeno` INT NOT NULL,
    `nivel_dolor_eva` TINYINT UNSIGNED DEFAULT 0,
    `estado_alerta` ENUM('NORMAL', 'ALERTA_MODERADA', 'ALERTA_CRITICA') NOT NULL DEFAULT 'NORMAL',
    `comentarios_clinicos` TEXT NULL,
    `fecha_toma` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_signos_paciente` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes_detalle` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_signos_responsable` FOREIGN KEY (`medico_o_enfermero_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- 7. TABLA: MEDICAMENTOS (Catálogo Institucional)
-- --------------------------------------------------------------------
CREATE TABLE `medicamentos` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `codigo` VARCHAR(30) NOT NULL UNIQUE,
    `nombre_comercial` VARCHAR(120) NOT NULL,
    `principio_activo` VARCHAR(120) NOT NULL,
    `presentacion` VARCHAR(80) NOT NULL,
    `stock_minimo` INT NOT NULL DEFAULT 10,
    `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- 8. TABLA: INVENTARIO_MEDICAMENTOS
-- Control estricto de existencias (con CHECK >= 0 para evitar negativos)
-- --------------------------------------------------------------------
CREATE TABLE `inventario_medicamentos` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `medicamento_id` INT UNSIGNED NOT NULL,
    `lote` VARCHAR(50) NOT NULL,
    `stock_actual` INT NOT NULL DEFAULT 0,
    `cantidad_deseada` INT NOT NULL DEFAULT 50,
    `cantidad_utilizada` INT NOT NULL DEFAULT 0,
    `fecha_vencimiento` DATE NOT NULL,
    `ubicacion_almacen` VARCHAR(50) DEFAULT 'Estación Central Post-Urgencias',
    `actualizado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_inventario_medicamento` FOREIGN KEY (`medicamento_id`) REFERENCES `medicamentos` (`id`) ON DELETE CASCADE,
    CONSTRAINT `chk_stock_no_negativo` CHECK (`stock_actual` >= 0)
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- 9. TABLA: PRESCRIPCIONES
-- Posología validada por Regex en PHP: ^\d{1,4}\s?(mg|g|ml|UI)\s*\|\s*c\/\s*\d{1,2}\s*hrs?\s*\|\s*\d{1,2}\s*días?$
-- --------------------------------------------------------------------
CREATE TABLE `prescripciones` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `paciente_id` INT UNSIGNED NOT NULL,
    `medico_id` INT UNSIGNED NOT NULL,
    `medicamento_id` INT UNSIGNED NOT NULL,
    `posologia_formato` VARCHAR(120) NOT NULL COMMENT 'Formato Regex: Dosis | Frecuencia | Duracion',
    `dosis_totales` INT NOT NULL DEFAULT 1,
    `dosis_administradas` INT NOT NULL DEFAULT 0,
    `dosis_pendientes` INT NOT NULL DEFAULT 1,
    `indicaciones_especiales` TEXT NULL,
    `estado` ENUM('ACTIVA', 'SUSPENDIDA', 'FINALIZADA') NOT NULL DEFAULT 'ACTIVA',
    `fecha_prescripcion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_presc_paciente` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes_detalle` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_presc_medico` FOREIGN KEY (`medico_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_presc_medicamento` FOREIGN KEY (`medicamento_id`) REFERENCES `medicamentos` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `chk_dosis_pendientes_no_negativas` CHECK (`dosis_pendientes` >= 0)
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- 10. TABLA: SOLICITUDES_ALTA (Aprobación Administrativa)
-- --------------------------------------------------------------------
CREATE TABLE `solicitudes_alta` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `paciente_id` INT UNSIGNED NOT NULL,
    `medico_solicitante_id` INT UNSIGNED NOT NULL,
    `admin_aprobador_id` INT UNSIGNED NULL,
    `resumen_clinico` TEXT NOT NULL,
    `criterios_cumplidos` TEXT NOT NULL,
    `estado` ENUM('PENDIENTE', 'APROBADA', 'RECHAZADA') NOT NULL DEFAULT 'PENDIENTE',
    `motivo_rechazo` TEXT NULL,
    `fecha_solicitud` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `fecha_resolucion` DATETIME NULL,
    CONSTRAINT `fk_sol_paciente` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes_detalle` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_sol_medico` FOREIGN KEY (`medico_solicitante_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_sol_admin` FOREIGN KEY (`admin_aprobador_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- 11. TABLA: CITAS_AGENDA (Multi-rol: Admin, Médico, Paciente)
-- --------------------------------------------------------------------
CREATE TABLE `citas_agenda` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `paciente_id` INT UNSIGNED NOT NULL,
    `medico_id` INT UNSIGNED NOT NULL,
    `tipo_evento` ENUM('RONDA_MEDICA', 'TERAPIA_KINESIOLOGIA', 'ADMINISTRACION_ENDOMED', 'CURACION', 'CONTROL_POST_ALTA') NOT NULL,
    `titulo` VARCHAR(150) NOT NULL,
    `descripcion` TEXT NULL,
    `fecha_inicio` DATETIME NOT NULL,
    `fecha_fin` DATETIME NOT NULL,
    `estado` ENUM('PROGRAMADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA', 'REASIGNADA') NOT NULL DEFAULT 'PROGRAMADA',
    `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_agenda_paciente` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes_detalle` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_agenda_medico` FOREIGN KEY (`medico_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- TRIGGER: Descontar stock al prescribir medicamento
-- Previene automáticamente stocks negativos mediante la restricción CHECK
-- --------------------------------------------------------------------
DELIMITER $$
CREATE TRIGGER `trg_descontar_stock_prescripcion`
AFTER INSERT ON `prescripciones`
FOR EACH ROW
BEGIN
    UPDATE `inventario_medicamentos`
    SET `stock_actual` = `stock_actual` - NEW.`dosis_totales`,
        `cantidad_utilizada` = `cantidad_utilizada` + NEW.`dosis_totales`
    WHERE `medicamento_id` = NEW.`medicamento_id`
    ORDER BY `fecha_vencimiento` ASC
    LIMIT 1;
END$$
DELIMITER ;

-- ====================================================================
-- SEED DATA: DATOS INICIALES PARA PRUEBAS INMEDIATAS
-- Contraseñas hasheadas con password_hash('Admin123!', PASSWORD_BCRYPT)
-- Hash de ejemplo: $2y$10$wT8m9sO.xNqQ7YfI2WcW.e7c6P7B3P2W5N7g6D8I1J0K9L8M7N6O5
-- ====================================================================

-- 1. Usuarios del Sistema
INSERT INTO `usuarios` (`id`, `rol_id`, `nombre_completo`, `email`, `password_hash`, `rut_dni`, `telefono`, `activo`) VALUES
(1, 1, 'Dra. Elena Ramos (Dirección Médica)', 'admin@hospital.local', '$2y$10$Qj/Z69VzUfgFv7XkXvF0euDcq4tUo/rPek8o2H7nQ5XyOqT0WjV6q', '12.345.678-9', '+56 9 8765 4321', 1),
(2, 2, 'Dr. Mateo Morales (Urgenciólogo)', 'dr.morales@hospital.local', '$2y$10$Qj/Z69VzUfgFv7XkXvF0euDcq4tUo/rPek8o2H7nQ5XyOqT0WjV6q', '15.987.654-3', '+56 9 7654 3210', 1),
(3, 2, 'Dra. Camila Fuentes (Medicina Interna)', 'dra.fuentes@hospital.local', '$2y$10$Qj/Z69VzUfgFv7XkXvF0euDcq4tUo/rPek8o2H7nQ5XyOqT0WjV6q', '16.432.109-8', '+56 9 6543 2109', 1),
(4, 3, 'Lucía Vargas Soto (Cama 04-B)', 'lucia.vargas@paciente.local', '$2y$10$Qj/Z69VzUfgFv7XkXvF0euDcq4tUo/rPek8o2H7nQ5XyOqT0WjV6q', '19.876.543-2', '+56 9 5432 1098', 1),
(5, 3, 'Fernando Rojas M. (Cama 02-A)', 'fernando.rojas@paciente.local', '$2y$10$Qj/Z69VzUfgFv7XkXvF0euDcq4tUo/rPek8o2H7nQ5XyOqT0WjV6q', '14.567.890-1', '+56 9 4321 0987', 1),
(6, 3, 'Beatriz Mendoza (Cama 06-B)', 'beatriz.mendoza@paciente.local', '$2y$10$Qj/Z69VzUfgFv7XkXvF0euDcq4tUo/rPek8o2H7nQ5XyOqT0WjV6q', '18.123.456-7', '+56 9 3210 9876', 1);

-- 2. Detalle Médicos
INSERT INTO `medicos_detalle` (`usuario_id`, `especialidad`, `numero_colegiado`, `turno`) VALUES
(2, 'Medicina de Urgencias y Cuidados Críticos', 'COLMED-45892', 'Guardia 24h'),
(3, 'Medicina Interna / Post-Urgencias', 'COLMED-51204', 'Mañana');

-- 3. Detalle Pacientes
INSERT INTO `pacientes_detalle` (`id`, `usuario_id`, `numero_cama`, `diagnostico_ingreso`, `fecha_ingreso`, `grupo_sanguineo`, `alergias`, `estado_automata`, `medico_asignado_id`, `tiempo_estimado_alta`) VALUES
(1, 4, 'Cama 04-B', 'Neumonía adquirida en la comunidad compensada con oxigenoterapia.', NOW() - INTERVAL 18 HOUR, 'A+', 'Penicilina y derivados', 'q3', 2, NOW() + INTERVAL 24 HOUR),
(2, 5, 'Cama 02-A', 'Cólico biliar agudo resuelto en observación post-analgesia.', NOW() - INTERVAL 28 HOUR, 'O+', 'Ninguna conocida', 'q2', 2, NOW() + INTERVAL 4 HOUR),
(3, 6, 'Cama 06-B', 'Crisis asmática moderada post-nebulización.', NOW() - INTERVAL 8 HOUR, 'B+', 'Sulfamidas', 'q4', 3, NOW() + INTERVAL 36 HOUR);

-- 4. Catálogo de Medicamentos
INSERT INTO `medicamentos` (`id`, `codigo`, `nombre_comercial`, `principio_activo`, `presentacion`, `stock_minimo`) VALUES
(1, 'MED-CEF-1G', 'Rocephin', 'Ceftriaxona', 'Frasco Ampolla 1 g IV', 15),
(2, 'MED-PAR-1G', 'Paracetamol IV', 'Paracetamol', 'Solución para Perfusión 1 g / 100 ml', 25),
(3, 'MED-SAL-100', 'Salbutamol Inhalador', 'Salbutamol', 'Inhalador 100 mcg / dosis (200 dosis)', 10),
(4, 'MED-KET-30', 'Ketorolaco Trometamol', 'Ketorolaco', 'Ampolla 30 mg / 1 ml IM/IV', 20),
(5, 'MED-HID-100', 'Actocortina', 'Hidrocortisona', 'Frasco Ampolla 100 mg liofilizado', 12),
(6, 'MED-ENOX-40', 'Clexane', 'Enoxaparina Sódica', 'Jeringa prellenada 40 mg / 0.4 ml SC', 15);

-- 5. Inventario Inicial
INSERT INTO `inventario_medicamentos` (`medicamento_id`, `lote`, `stock_actual`, `cantidad_deseada`, `cantidad_utilizada`, `fecha_vencimiento`) VALUES
(1, 'LOTE-CF-2026-A', 38, 50, 12, '2027-11-30'),
(2, 'LOTE-PC-2026-C', 64, 80, 26, '2028-02-15'),
(3, 'LOTE-SB-2025-F', 8, 25, 17, '2026-12-31'),
(4, 'LOTE-KT-2026-X', 18, 40, 22, '2027-08-20'),
(5, 'LOTE-HC-2026-M', 14, 30, 16, '2027-05-10'),
(6, 'LOTE-EX-2026-Z', 29, 45, 11, '2027-09-18');

-- 6. Signos Vitales
INSERT INTO `signos_vitales` (`paciente_id`, `medico_o_enfermero_id`, `presion_sistolica`, `presion_diastolica`, `frecuencia_cardiaca`, `frecuencia_respiratoria`, `temperatura`, `saturacion_oxigeno`, `nivel_dolor_eva`, `estado_alerta`, `comentarios_clinicos`) VALUES
(1, 2, 122, 78, 84, 18, 36.8, 97, 2, 'NORMAL', 'Paciente lúcida, con buena mecánica ventilatoria tras 2da dosis antibiótica.'),
(2, 2, 118, 74, 72, 16, 36.5, 99, 1, 'NORMAL', 'Sin dolor abdominal residual, abdomen blando, diuresis conservada. Apto para solicitud de alta.'),
(3, 3, 135, 88, 104, 22, 37.4, 94, 4, 'ALERTA_MODERADA', 'Discreta taquicardia refleja post broncodilatador, sibilancias espiratorias aisladas.');

-- 7. Prescripciones
INSERT INTO `prescripciones` (`paciente_id`, `medico_id`, `medicamento_id`, `posologia_formato`, `dosis_totales`, `dosis_administradas`, `dosis_pendientes`, `indicaciones_especiales`, `estado`) VALUES
(1, 2, 1, '1 g | c/ 12 hrs | 3 días', 6, 2, 4, 'Diluir en 100 ml de Solución Fisiológica al 0.9% a pasar en 30 minutos.', 'ACTIVA'),
(1, 2, 2, '1 g | c/ 8 hrs | 2 días', 6, 2, 4, 'Pasar EV condicional a temperatura > 37.8°C o dolor EVA >= 4.', 'ACTIVA'),
(2, 2, 4, '30 mg | c/ 8 hrs | 1 días', 3, 3, 0, 'Última dosis administrada sin complicaciones. Tratamiento concluido.', 'FINALIZADA'),
(3, 3, 5, '100 mg | c/ 8 hrs | 2 días', 6, 1, 5, 'Bolo EV lento en 3 minutos. Evaluar respuesta bronquial.', 'ACTIVA');

-- 8. Bitácora Clínica de Estados
INSERT INTO `bitacora_paciente` (`paciente_id`, `medico_id`, `estado_previo`, `estado_nuevo`, `accion_evento`, `observaciones`, `signos_resumen`) VALUES
(1, 2, 'INGRESO_URGENCIA', 'TRIAJE_POST_URGENCIA', 'TRIAR', 'Paciente derivada de Shockroom con diagnóstico de NAC. Asignada a cama 04-B.', 'PA: 130/85, FC: 98, SpO2: 92%'),
(1, 2, 'TRIAJE_POST_URGENCIA', 'ESTABILIZACION', 'ESTABILIZAR', 'Instalación de cánula nasal a 2L/min y vía venosa periférica permeable.', 'PA: 125/80, FC: 88, SpO2: 96%'),
(1, 2, 'ESTABILIZACION', 'TRATAMIENTO_ACTIVO', 'PRESCRIBIR_TRATAMIENTO', 'Inicio de terapia antibiótica dirigida con Ceftriaxona 1g c/12h.', 'PA: 122/78, FC: 84, SpO2: 97%'),
(2, 2, 'EVALUACION_MEDICA', 'SOLICITUD_ALTA', 'SOLICITAR_ALTA', 'Paciente asintomático, signos normales, sin dosis pendientes de analgesia EV. Enviado a dirección médica.', 'PA: 118/74, FC: 72, SpO2: 99%');

-- 9. Solicitudes de Alta Administrativa
INSERT INTO `solicitudes_alta` (`paciente_id`, `medico_solicitante_id`, `admin_aprobador_id`, `resumen_clinico`, `criterios_cumplidos`, `estado`, `fecha_solicitud`) VALUES
(2, 2, NULL, 'Paciente Fernando Rojas (Cama 02-A). Cólico biliar completamente resuelto, curva térmica afebril 24h, tolerancia oral positiva, sin dolor a la palpación.', 'Hemodinámicamente estable; Dosis EV completadas; Cero alertas en signos vitales; Tolerancia alimentaria comprobada', 'PENDIENTE', NOW() - INTERVAL 1 HOUR);

-- 10. Citas y Agenda Multi-Rol
INSERT INTO `citas_agenda` (`paciente_id`, `medico_id`, `tipo_evento`, `titulo`, `descripcion`, `fecha_inicio`, `fecha_fin`, `estado`) VALUES
(1, 2, 'RONDA_MEDICA', 'Ronda de Evolución Neumonía', 'Auscultación pulmonar y revisión de exámenes de laboratorio matutinos.', NOW() + INTERVAL 2 HOUR, NOW() + INTERVAL 3 HOUR, 'PROGRAMADA'),
(1, 2, 'ADMINISTRACION_ENDOMED', 'Administración Ceftriaxona 1g', '3ra dosis programada por enfermería vía catéter periférico.', NOW() + INTERVAL 6 HOUR, NOW() + INTERVAL 7 HOUR, 'PROGRAMADA'),
(1, 2, 'TERAPIA_KINESIOLOGIA', 'Kinesioterapia Respiratoria', 'Ejercicios de expansión torácica y espirometría incentivada en cama.', NOW() + INTERVAL 10 HOUR, NOW() + INTERVAL 11 HOUR, 'PROGRAMADA'),
(2, 2, 'CONTROL_POST_ALTA', 'Firma y Entrega de Epicrisis', 'Entrega de receta de analgesia oral y cita de control ambulatorio.', NOW() + INTERVAL 4 HOUR, NOW() + INTERVAL 5 HOUR, 'PROGRAMADA'),
(3, 3, 'RONDA_MEDICA', 'Evaluación de Vía Aérea', 'Verificación de patrón respiratorio post hidrocortisona y flujo espiratorio.', NOW() + INTERVAL 1 HOUR, NOW() + INTERVAL 2 HOUR, 'PROGRAMADA');
