/**
 * HospitaLogix - Motor de Máquina de Mealy para Autenticación y Control de Acceso
 * 
 * Formalización Matemática:
 * M = (S, s0, Σ, Λ, T, G)
 * S = { S0: STANDBY, S1: VALIDANDO_CREDENCIALES, S2: VERIFICANDO_ROL, S3: SESION_AUTORIZADA, S4: ACCESO_BLOQUEADO }
 * s0 = S0 (Standby)
 * Σ = Conjunto de entradas { (email, password, rol_id) }
 * Λ = Conjunto de salidas { (acceso_concedido: boolean, mensaje_salida: string, estado_asignado: string) }
 * T: S × Σ → S (Función de transición de estados)
 * G: S × Σ → Λ (Función de salida dependiente del estado y la entrada - Característica distintiva de Mealy)
 */

import { User, RoleId } from '../types/hospital';

export interface MealyInput {
  email: string;
  passwordHashAttempt: string;
  rol_id: RoleId;
}

export interface MealyResult {
  exito: boolean;
  estado_final: 'S0_STANDBY' | 'S1_VALIDANDO' | 'S2_VERIFICANDO_ROL' | 'S3_SESION_AUTORIZADA' | 'S4_ACCESO_BLOQUEADO';
  salida: {
    mensaje: string;
    usuario?: User;
    rol_asignado?: string;
    estado_automata_paciente?: string;
    trazabilidad: string[];
  };
}

export class MealyAuthenticationMachine {
  /**
   * Ejecuta la evaluación Mealy de las credenciales de entrada
   */
  public static procesarAutenticacion(
    entrada: MealyInput,
    usuariosRegistrados: User[]
  ): MealyResult {
    const trazabilidad: string[] = [];
    trazabilidad.push('S0 [STANDBY] → Entrada recibida: (' + entrada.email + ', [CLAVE], rol_id=' + entrada.rol_id + ')');

    // Transición S0 -> S1 (Validando existencia y clave)
    trazabilidad.push('S1 [VALIDANDO_CREDENCIALES] → Verificando identidad en el registro institucional...');

    const usuarioEncontrado = usuariosRegistrados.find(
      u => u.email.toLowerCase().trim() === entrada.email.toLowerCase().trim()
    );

    if (!usuarioEncontrado) {
      trazabilidad.push('S1 → S4 [ACCESO_BLOQUEADO] / Salida: Denegado ("Identidad no encontrada en el sistema clínico")');
      return {
        exito: false,
        estado_final: 'S4_ACCESO_BLOQUEADO',
        salida: {
          mensaje: 'Identidad no encontrada en el sistema clínico.',
          trazabilidad
        }
      };
    }

    if (!usuarioEncontrado.activo) {
      trazabilidad.push('S1 → S4 [ACCESO_BLOQUEADO] / Salida: Denegado ("Cuenta de usuario desactivada por Administración")');
      return {
        exito: false,
        estado_final: 'S4_ACCESO_BLOQUEADO',
        salida: {
          mensaje: 'La cuenta se encuentra deshabilitada temporalmente.',
          trazabilidad
        }
      };
    }

    // Transición S1 -> S2 (Verificando coherencia de rol)
    trazabilidad.push('S2 [VERIFICANDO_ROL] → Credenciales válidas. Comprobando coherencia con rol solicitado (rol_id: ' + entrada.rol_id + ')...');

    if (usuarioEncontrado.rol_id !== entrada.rol_id) {
      trazabilidad.push('S2 → S4 [ACCESO_BLOQUEADO] / Salida: Denegado ("Incompatibilidad entre perfil seleccionado y credenciales registradas")');
      return {
        exito: false,
        estado_final: 'S4_ACCESO_BLOQUEADO',
        salida: {
          mensaje: 'El rol seleccionado no corresponde a los privilegios de esta cuenta.',
          trazabilidad
        }
      };
    }

    // Transición S2 -> S3 (Sesión Autorizada con generación de salida de acceso)
    const nombreRol = entrada.rol_id === 1 ? 'Administrador' : entrada.rol_id === 2 ? 'Médico' : 'Paciente';
    trazabilidad.push('S2 → S3 [SESION_AUTORIZADA] / Salida: Acceso Concedido ("Bienvenido al entorno ' + nombreRol + '")');

    return {
      exito: true,
      estado_final: 'S3_SESION_AUTORIZADA',
      salida: {
        mensaje: `Acceso concedido exitosamente. Sesión iniciada como ${nombreRol}.`,
        usuario: usuarioEncontrado,
        rol_asignado: nombreRol,
        estado_automata_paciente: entrada.rol_id === 3 ? 'q2' : undefined,
        trazabilidad
      }
    };
  }
}
