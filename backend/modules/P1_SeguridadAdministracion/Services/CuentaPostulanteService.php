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
     * Ejemplo: CI=9355594 → código=20264955539
     */
    public function generarCodigoParaPostulante(string $ci): string
    {
        return '2026' . strrev($ci);
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

        if (strtoupper($postulante->pago_estado ?? '') !== 'PAGADO') {
            throw new \Exception("No se puede generar la cuenta de acceso porque el postulante no cuenta con un pago confirmado (Estado actual: " . ($postulante->pago_estado ?: 'PENDIENTE') . ").");
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

        // 3. Código = 2026 + CI invertido (ej. CI=9355594 → codigo=20264955539)
        $codigo = $this->generarCodigoParaPostulante($postulante->ci);

        if (User::where('codigo', $codigo)->exists()) {
            throw new \Exception("Ya existe un usuario con el código generado para este CI.");
        }

        // 4. Crear el usuario — contraseña inicial es el CI; debe cambiarla al primer ingreso
        $user = User::create([
            'name' => trim($postulante->nombres . ' ' . $postulante->apellidos),
            'email' => $postulante->email,
            'ci' => $postulante->ci,
            'password' => Hash::make($postulante->ci),
            'role_id' => $role->id,
            'estado' => 'activo',
            'codigo' => $codigo,
            'must_change_password' => true,
        ]);

        // 5. Vincular al postulante y marcar como INSCRITO
        $postulante->user_id = $user->id;
        $postulante->codigo_usuario = $codigo;
        $postulante->estado_tramite = 'INSCRITO';
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
