<?php

namespace App\Packages\P1_SeguridadAdministracion\Services;

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
     * Generar un código numérico único de 6 dígitos.
     */
    public function generarCodigoUnico(): string
    {
        do {
            $codigo = strval(mt_rand(100000, 999999));
        } while (User::where('codigo', $codigo)->exists());

        return $codigo;
    }

    /**
     * Crear cuenta para un postulante.
     */
    public function crearCuenta(Postulante $postulante): User
    {
        // 1. Evitar duplicados
        if ($postulante->user_id) {
            throw new \Exception("El postulante ya tiene una cuenta de usuario asignada.");
        }

        $existingUser = User::where('email', $postulante->email)
                            ->orWhere('ci', $postulante->ci)
                            ->first();

        if ($existingUser) {
            throw new \Exception("Ya existe un usuario registrado con el correo o CI de este postulante.");
        }

        // 2. Obtener rol de postulante
        $role = Role::where('name', 'postulante')->first();
        if (!$role) {
            throw new \Exception("El rol 'postulante' no existe en el sistema.");
        }

        // 3. Generar código único de 6 dígitos
        $codigo = $this->generarCodigoUnico();

        // 4. Crear el usuario
        $user = User::create([
            'name' => trim($postulante->nombres . ' ' . $postulante->apellidos),
            'email' => $postulante->email,
            'ci' => $postulante->ci,
            'password' => Hash::make($postulante->ci), // Contraseña inicial es su CI
            'role_id' => $role->id,
            'estado' => 'activo',
            'codigo' => $codigo,
            'must_change_password' => true,
        ]);

        // 5. Vincular al postulante
        $postulante->user_id = $user->id;
        $postulante->codigo_usuario = $codigo;
        $postulante->estado_tramite = 'CUENTA_CREADA';
        $postulante->cuenta_creada_at = now();
        $postulante->save();

        // 6. Enviar correo automático
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
