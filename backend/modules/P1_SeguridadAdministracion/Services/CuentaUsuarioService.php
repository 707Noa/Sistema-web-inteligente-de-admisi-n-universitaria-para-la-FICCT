<?php

namespace Modules\P1_SeguridadAdministracion\Services;

use App\Models\User;
use App\Models\Postulante;
use App\Models\Docente;
use App\Models\Role;
use App\Mail\CuentaUsuarioMail;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class CuentaUsuarioService
{
    /**
     * Generar un Registro único de usuario.
     * Combina: AÑO DE INGRESO + CI/CARNET AL REVÉS.
     * Si ya existe, añade un sufijo numérico incremental.
     *
     * @param string $ci
     * @param int|null $anioIngreso
     * @return string
     */
    public function generarRegistroUnico(string $ci, ?int $anioIngreso = null): string
    {
        // 1. Limpiar CI dejando solo dígitos
        $ciLimpio = preg_replace('/\D/', '', $ci);
        if (empty($ciLimpio)) {
            $ciLimpio = str_replace(' ', '', $ci);
        }

        // 2. Invertir CI
        $ciInvertido = strrev($ciLimpio);

        // 3. Obtener año de ingreso
        $anio = $anioIngreso ?: date('Y');

        // 4. Crear registro base = año + ciInvertido
        $base = $anio . $ciInvertido;
        $registro = $base;
        $contador = 1;

        // 5. Verificar si existe y agregar sufijo incremental
        while ($this->registroExiste($registro)) {
            $registro = $base . $contador;
            $contador++;
        }

        return $registro;
    }

    /**
     * Verificar si existe el registro en users.codigo o postulantes.codigo_usuario
     *
     * @param string $registro
     * @return bool
     */
    private function registroExiste(string $registro): bool
    {
        // Verificar en tabla de usuarios (campo codigo/registro)
        $existeEnUsers = User::where('codigo', $registro)->exists();

        // Verificar en tabla de postulantes (campo codigo_usuario)
        $existeEnPostulantes = Postulante::where('codigo_usuario', $registro)->exists();

        return $existeEnUsers || $existeEnPostulantes;
    }

    /**
     * Crear una cuenta de usuario a partir de datos normalizados.
     *
     * @param array $datos
     * @param string $perfil
     * @return User
     * @throws \Exception
     */
    public function crearCuentaDesdeDatos(array $datos, string $perfil): User
    {
        // 1. Normalizar y validar campos mínimos obligatorios
        $nombres = trim($datos['nombres'] ?? $datos['nombre'] ?? '');
        $apellidos = trim($datos['apellidos'] ?? $datos['apellido'] ?? '');
        $ci = trim($datos['ci'] ?? $datos['carnet'] ?? '');
        $email = trim($datos['correo_electronico'] ?? $datos['correo'] ?? $datos['email'] ?? '');
        $anioIngreso = isset($datos['anio_ingreso']) ? intval($datos['anio_ingreso']) : null;

        if (empty($nombres)) {
            throw new \Exception("Nombres vacíos o no especificados en la fila.");
        }
        if (empty($apellidos)) {
            throw new \Exception("Apellidos vacíos o no especificados en la fila.");
        }
        if (empty($ci)) {
            throw new \Exception("CI vacía o no especificada en la fila.");
        }
        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \Exception("Correo electrónico vacío, ausente o con formato inválido.");
        }

        // 2. Normalizar Rol/Perfil
        $normalizedProfile = strtolower(trim($perfil));
        $roleName = $normalizedProfile;
        $perfilDisplay = ucfirst($perfil);

        if ($normalizedProfile === 'coordinador académico' || $normalizedProfile === 'coordinador academico' || $normalizedProfile === 'coordinador') {
            $roleName = 'coordinador';
            $perfilDisplay = 'Coordinador Académico';
        } elseif ($normalizedProfile === 'autoridad académica' || $normalizedProfile === 'autoridad academica' || $normalizedProfile === 'autoridad') {
            $roleName = 'autoridad';
            $perfilDisplay = 'Autoridad Académica';
        } elseif ($normalizedProfile === 'postulante') {
            $roleName = 'postulante';
            $perfilDisplay = 'Postulante';
        } elseif ($normalizedProfile === 'docente') {
            $roleName = 'docente';
            $perfilDisplay = 'Docente';
        } elseif ($normalizedProfile === 'administrador' || $normalizedProfile === 'admin') {
            $roleName = 'administrador';
            $perfilDisplay = 'Administrador';
        }

        $role = Role::where('name', $roleName)->first();
        if (!$role) {
            throw new \Exception("El perfil/rol '{$perfil}' (normalizado: '{$roleName}') no existe en el sistema.");
        }

        // 3. Validar duplicados de CI y Email en la tabla de usuarios
        $existingCi = User::where('ci', $ci)->first();
        if ($existingCi) {
            throw new \Exception("CI duplicado: ya existe un usuario con el CI {$ci}.");
        }

        $existingEmail = User::where('email', $email)->first();
        if ($existingEmail) {
            throw new \Exception("Correo duplicado: ya existe un usuario con el correo {$email}.");
        }

        // 4. Generar Registro único de 6 dígitos o bajo la regla del año de ingreso
        $registroCode = $this->generarRegistroUnico($ci, $anioIngreso);

        // 5. Crear el registro de Usuario (Contraseña inicial = CI, hasheada)
        $user = User::create([
            'name' => trim($nombres . ' ' . $apellidos),
            'email' => $email,
            'ci' => $ci,
            'password' => Hash::make($ci),
            'role_id' => $role->id,
            'estado' => 'activo',
            'codigo' => $registroCode,
            'must_change_password' => true,
        ]);

        // 6. Vinculación a modelos de perfil si corresponden
        $postulante = null;
        if ($roleName === 'postulante') {
            // Vincular al postulante si existe un preinscrito con el mismo CI
            $postulante = Postulante::where('ci', $ci)->first();
            if ($postulante) {
                $postulante->user_id = $user->id;
                $postulante->codigo_usuario = $registroCode;
                $postulante->estado_tramite = 'CUENTA_CREADA';
                $postulante->cuenta_creada_at = now();
                $postulante->save();
            }
        } elseif ($roleName === 'docente') {
            // Vincular al docente si existe un docente con el mismo CI
            $docente = Docente::where('ci', $ci)->first();
            if ($docente) {
                $docente->user_id = $user->id;
                $docente->save();
            }
        }

        // 7. Enviar Correo con instrucciones de acceso
        $urlLogin = env('FRONTEND_URL', 'http://localhost:5173') . '/login';
        
        try {
            Mail::to($email)->send(new CuentaUsuarioMail(
                trim($nombres . ' ' . $apellidos),
                $perfilDisplay,
                $registroCode,
                $ci,
                $urlLogin
            ));

            if ($postulante) {
                $postulante->correo_enviado_at = now();
                $postulante->save();
            }
        } catch (\Exception $e) {
            Log::error("Error al enviar correo de credenciales al usuario {$email}: " . $e->getMessage());
            throw new \Exception("Cuenta creada, pero correo no enviado: " . $e->getMessage());
        }

        return $user;
    }
}
