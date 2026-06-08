<?php

namespace Modules\P1_SeguridadAdministracion\Services;

use App\Models\User;
use App\Models\Postulante;
use App\Models\Role;
use App\Mail\CuentaPostulanteMail;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class CuentaPostulanteService
{
    /**
     * Generar código de acceso para postulante: año de inscripción + CI invertido.
     * Si ya existe, se añaden sufijos numéricos correlativos (1, 2, 3...).
     */
    public function generarCodigoParaPostulante(string $ci): string
    {
        $base = '2026' . strrev($ci);
        $codigo = $base;
        $suffix = 1;
        while (User::where('codigo', $codigo)->exists()) {
            $codigo = $base . $suffix;
            $suffix++;
        }
        return $codigo;
    }

    /**
     * Crear cuenta para un postulante.
     */
    public function crearCuenta(Postulante $postulante): User
    {
        // 1. Evitar duplicados / ya tiene cuenta
        if ($postulante->user_id) {
            throw new \Exception("Ya tiene cuenta creada.");
        }

        // 2. No crear cuenta para postulantes inactivos
        if (strtoupper($postulante->estado_tramite ?? '') === 'INACTIVO' || $postulante->estado === 'inactivo') {
            throw new \Exception("No se puede crear cuenta para postulantes inactivos.");
        }

        // 3. Estado PREINSCRITO
        if (strtoupper($postulante->estado_tramite ?? '') !== 'PREINSCRITO') {
            throw new \Exception("El postulante debe estar en estado PREINSCRITO.");
        }

        // 4. Requisitos = Sí (documentos obligatorios)
        if (!$postulante->requisitos_completos) {
            throw new \Exception("Faltan documentos obligatorios.");
        }

        // 5. Verificar si ya existe un usuario con el mismo CI
        $existingUser = User::where('ci', $postulante->ci)->first();
        if ($existingUser) {
            // Verificar que tenga el rol de 'postulante'
            if (!$existingUser->hasRole('postulante')) {
                throw new \Exception("Ya existe un usuario con el mismo CI con un rol diferente.");
            }

            // Verificar si hay otro postulante activo vinculado a este usuario
            $otherPostulante = Postulante::where('user_id', $existingUser->id)
                ->where('id', '!=', $postulante->id)
                ->exists();
            if ($otherPostulante) {
                throw new \Exception("Ya existe otro postulante vinculado a esta cuenta de usuario.");
            }

            // Generar o reutilizar el código
            if (empty($existingUser->codigo)) {
                $existingUser->codigo = $this->generarCodigoParaPostulante($postulante->ci);
            }
            $codigo = $existingUser->codigo;

            // Verificar duplicados de correo y código excluyendo al usuario actual
            if ($postulante->email) {
                if (User::where('email', $postulante->email)->where('id', '!=', $existingUser->id)->exists()) {
                    throw new \Exception("Ya existe un usuario con el mismo correo.");
                }
            }

            if (User::where('codigo', $codigo)->where('id', '!=', $existingUser->id)->exists()) {
                throw new \Exception("Ya existe un usuario con el mismo código de registro.");
            }

            // Reutilizar/relinkear la cuenta existente
            $existingUser->name = trim($postulante->nombres . ' ' . $postulante->apellidos);
            $existingUser->email = $postulante->email;
            $existingUser->password = $postulante->ci;
            $existingUser->estado = 'activo';
            $existingUser->must_change_password = true;
            $existingUser->save();

            $user = $existingUser;
        } else {
            // 6. No debe existir usuario con el mismo correo
            if ($postulante->email && User::where('email', $postulante->email)->exists()) {
                throw new \Exception("Ya existe un usuario con el mismo correo.");
            }

            // 7. Obtener rol de postulante
            $role = Role::where('name', 'postulante')->first();
            if (!$role) {
                throw new \Exception("El rol 'postulante' no existe en el sistema.");
            }

            // 8. Código = 2026 + CI invertido (ej. CI=9355594 → codigo=20264955539) + sufijos si existe
            $codigo = $this->generarCodigoParaPostulante($postulante->ci);

            // 9. No debe existir usuario con el mismo registro/código (adicional al loop del generador)
            if (User::where('codigo', $codigo)->exists()) {
                throw new \Exception("Ya existe un usuario con el mismo código de registro.");
            }

            // 10. Crear el usuario — contraseña inicial es el CI (guardada en texto plano para que el cast del modelo lo hashee)
            $user = User::create([
                'name' => trim($postulante->nombres . ' ' . $postulante->apellidos),
                'email' => $postulante->email,
                'ci' => $postulante->ci,
                'password' => $postulante->ci,
                'role_id' => $role->id,
                'estado' => 'activo',
                'codigo' => $codigo,
                'must_change_password' => true,
            ]);
        }

        // 11. Vincular al postulante y marcar como INSCRITO
        $postulante->user_id = $user->id;
        $postulante->codigo_usuario = $codigo;
        $postulante->estado_tramite = 'INSCRITO';
        $postulante->cuenta_creada_at = now();
        $postulante->save();

        // 12. Enviar correo automático
        $this->enviarCorreo($postulante, $codigo);

        return $user;
    }

    /**
     * Enviar correo con credenciales.
     */
    public function enviarCorreo(Postulante $postulante, string $codigo): void
    {
        try {
            Mail::to($postulante->email)->send(new CuentaPostulanteMail($postulante, $codigo));
            $postulante->correo_enviado_at = now();
            $postulante->save();
        } catch (\Exception $e) {
            Log::error("Error al enviar correo de credenciales al postulante ID {$postulante->id}: " . $e->getMessage());
        }
    }
}
