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

        // 5. No debe existir usuario con el mismo CI
        if (User::where('ci', $postulante->ci)->exists()) {
            throw new \Exception("Ya existe un usuario con el mismo CI.");
        }

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

        // 10. Crear el usuario — contraseña inicial es el CI
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
