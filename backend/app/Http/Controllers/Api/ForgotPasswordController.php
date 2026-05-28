<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class ForgotPasswordController extends Controller
{
    public function sendResetLink(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'message' => 'El correo no está registrado.',
            ], 404);
        }

        // Generar token
        $token = Str::random(64);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $request->email],
            [
                'token' => hash('sha256', $token),
                'created_at' => now(),
            ]
        );

        // Enviar correo
        $resetUrl = env('FRONTEND_URL', 'http://localhost:5173') . '/reset-password/' . $token . '?email=' . urlencode($request->email);

        try {
            Mail::raw(
                "Hola {$user->name},\n\nRecibimos una solicitud para restablecer tu contraseña.\n\nHaz clic en el siguiente enlace:\n{$resetUrl}\n\nEste enlace expirará en 60 minutos.\n\nSi no solicitaste este cambio, ignora este correo.\n\nPortal Preuniversitario",
                function ($message) use ($request) {
                    $message->to($request->email)
                            ->subject('Restablecer contraseña - Portal Preuniversitario');
                }
            );
        } catch (\Exception $e) {
            // Log error pero no revelar detalles al usuario
        }

        AuditoriaService::registrar(
            $user->id,
            'Solicitud de recuperación de contraseña',
            'Autenticación',
            $request
        );

        return response()->json([
            'message' => 'Correo enviado correctamente. Revisa tu bandeja de entrada.',
        ]);
    }
}
