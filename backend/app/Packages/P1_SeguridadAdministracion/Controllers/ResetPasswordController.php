<?php

namespace App\Packages\P1_SeguridadAdministracion\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Packages\P4_ReportesMonitoreoAuditoria\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class ResetPasswordController extends Controller
{
    public function reset(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $record = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        if (!$record) {
            return response()->json(['message' => 'El enlace ha expirado.'], 400);
        }

        // Verificar token
        if (!Hash::check($request->token, $record->token) && hash('sha256', $request->token) !== $record->token) {
            return response()->json(['message' => 'El enlace ha expirado.'], 400);
        }

        // Verificar expiración (60 minutos)
        $createdAt = \Carbon\Carbon::parse($record->created_at);
        if ($createdAt->addMinutes(60)->isPast()) {
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();
            return response()->json(['message' => 'El enlace ha expirado.'], 400);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['message' => 'El correo no está registrado.'], 404);
        }

        $user->password = Hash::make($request->password);
        $user->save();

        // Eliminar token usado
        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        AuditoriaService::registrar(
            $user->id,
            'Cambio de contraseña por recuperación',
            'Autenticación',
            $request
        );

        return response()->json(['message' => 'Contraseña actualizada correctamente.']);
    }
}
