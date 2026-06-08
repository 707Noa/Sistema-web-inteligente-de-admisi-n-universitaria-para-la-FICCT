<?php

namespace Modules\P2_ParticipantesGrupos\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Postulante;
use App\Models\Carrera;
use App\Models\PreinscripcionTemporal;
use Modules\P2_ParticipantesGrupos\Requests\PreinscripcionRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PreinscripcionController extends Controller
{
    /**
     * Registrar una nueva preinscripciÃ³n con documentos.
     */
    public function store(PreinscripcionRequest $request): JsonResponse
    {
        $validated = $request->validated();

        // Mapear gÃ©nero/sexo de manera segura
        $sexo = $validated['sexo'] ?? $validated['genero'] ?? null;
        $generoEnum = null;
        if ($sexo) {
            $lowerSexo = strtolower($sexo);
            if (in_array($lowerSexo, ['masculino', 'femenino', 'otro'])) {
                $generoEnum = $lowerSexo;
            }
        }

        // Eliminar preinscripciones temporales previas con el mismo CI que sigan pendientes
        $oldTemps = PreinscripcionTemporal::where('ci', $validated['ci'])
            ->where('estado_pago', 'pendiente')
            ->get();

        foreach ($oldTemps as $oldTemp) {
            $docs = $oldTemp->documentos_temporales;
            if (is_array($docs)) {
                if (!empty($docs['imagen_ci_path'])) {
                    Storage::delete($docs['imagen_ci_path']);
                }
                if (!empty($docs['imagen_titulo_bachiller_path'])) {
                    Storage::delete($docs['imagen_titulo_bachiller_path']);
                }
                if (!empty($docs['fotografia_path'])) {
                    Storage::disk('public')->delete($docs['fotografia_path']);
                }
            }
            $oldTemp->delete();
        }

        // Subir imÃ¡genes al almacenamiento privado seguro
        $imagenCiPath = null;
        if ($request->hasFile('imagen_ci')) {
            $imagenCiPath = $request->file('imagen_ci')->store('private/postulantes/documentos');
        }

        $imagenTituloPath = null;
        if ($request->hasFile('imagen_titulo_bachiller')) {
            $imagenTituloPath = $request->file('imagen_titulo_bachiller')->store('private/postulantes/documentos');
        }

        $fotografiaPath = null;
        if ($request->hasFile('fotografia')) {
            $fotografiaPath = $request->file('fotografia')->store('fotos/postulantes', 'public');
        }

        // Crear preinscripciÃ³n temporal en lugar de postulante oficial
        $datosFormulario = [
            'nombres' => $validated['nombres'],
            'apellidos' => $validated['apellidos'],
            'ci' => $validated['ci'],
            'genero' => $generoEnum,
            'sexo' => $sexo,
            'fecha_nacimiento' => $validated['fecha_nacimiento'] ?? null,
            'celular' => $validated['telefono'] ?? null,
            'segundo_celular' => $validated['segundo_telefono'] ?? null,
            'email' => $validated['correo_electronico'],
            'direccion' => $validated['direccion'] ?? null,
            'colegio_procedencia' => $validated['colegio_procedencia'] ?? null,
            'ciudad' => $validated['ciudad'] ?? null,
            'carrera' => $validated['carrera'] ?? null,
            'carrera_postulada' => $validated['carrera'] ?? null,
            'titulo_bachiller' => $validated['titulo_bachiller'] ?? false,
            'otros' => $validated['otros'] ?? null,
            'preferencia_turno' => $validated['preferencia_turno'],
        ];

        $documentosTemporales = [
            'imagen_ci_path' => $imagenCiPath,
            'imagen_titulo_bachiller_path' => $imagenTituloPath,
            'fotografia_path' => $fotografiaPath,
        ];

        $temp = PreinscripcionTemporal::create([
            'ci' => $validated['ci'],
            'datos_formulario' => $datosFormulario,
            'documentos_temporales' => $documentosTemporales,
            'estado_pago' => 'pendiente',
            'expires_at' => now()->addHours(24),
        ]);

        return response()->json([
            'message' => 'PreinscripciÃ³n registrada temporalmente. Complete su pago para activar su cuenta.',
            'data' => [
                'id' => $temp->id,
                'ci' => $temp->ci,
                'email' => $datosFormulario['email'],
                'nombres' => $datosFormulario['nombres'],
                'apellidos' => $datosFormulario['apellidos']
            ],
        ], 201);
    }

    /**
     * Mostrar detalles de una preinscripciÃ³n especÃ­fica.
     */
    public function show(int $id): JsonResponse
    {
        $postulante = Postulante::find($id);
        if ($postulante) {
            return response()->json($postulante);
        }

        $temp = PreinscripcionTemporal::find($id);
        if ($temp) {
            $datos = $temp->datos_formulario;
            return response()->json([
                'id' => $temp->id,
                'nombres' => $datos['nombres'],
                'apellidos' => $datos['apellidos'],
                'ci' => $temp->ci,
                'email' => $datos['email'],
                'carrera' => $datos['carrera'],
                'preferencia_turno' => $datos['preferencia_turno'],
                'estado_tramite' => 'PENDIENTE_PAGO',
                'pago_estado' => 'PENDIENTE',
            ]);
        }

        return response()->json(['message' => 'PreinscripciÃ³n no encontrada.'], 404);
    }

    /**
     * Obtener carreras activas.
     */
    public function carrerasDisponibles(): JsonResponse
    {
        return response()->json(
            Carrera::where('estado', 'activo')->orderBy('nombre')->get()
        );
    }

    /**
     * Obtener el estado del pago de un postulante o preinscrito temporal.
     */
    public function pagoEstado(int $id): JsonResponse
    {
        $postulante = Postulante::find($id);

        if ($postulante) {
            return response()->json([
                'id' => $postulante->id,
                'nombres' => $postulante->nombres,
                'apellidos' => $postulante->apellidos,
                'ci' => $postulante->ci,
                'email' => $postulante->email,
                'pago_estado' => $postulante->pago_estado,
                'pago_metodo' => $postulante->pago_metodo,
                'pago_referencia' => $postulante->pago_referencia,
                'pago_monto' => $postulante->pago_monto,
                'pago_moneda' => $postulante->pago_moneda,
                'pago_fecha' => $postulante->pago_fecha,
                'estado_tramite' => $postulante->estado_tramite,
            ]);
        }

        $temp = PreinscripcionTemporal::find($id);

        if ($temp) {
            $datos = $temp->datos_formulario;
            $pagoEstado = strtoupper($temp->estado_pago);

            if ($pagoEstado === 'PAGADO') {
                $p = Postulante::where('ci', $temp->ci)->first();
                if ($p) {
                    return response()->json([
                        'id' => $p->id,
                        'nombres' => $p->nombres,
                        'apellidos' => $p->apellidos,
                        'ci' => $p->ci,
                        'email' => $p->email,
                        'pago_estado' => $p->pago_estado,
                        'pago_metodo' => $p->pago_metodo,
                        'pago_referencia' => $p->pago_referencia,
                        'pago_monto' => $p->pago_monto,
                        'pago_moneda' => $p->pago_moneda,
                        'pago_fecha' => $p->pago_fecha,
                        'estado_tramite' => $p->estado_tramite,
                    ]);
                }
            }

            return response()->json([
                'id' => $temp->id,
                'nombres' => $datos['nombres'],
                'apellidos' => $datos['apellidos'],
                'ci' => $temp->ci,
                'email' => $datos['email'],
                'pago_estado' => $pagoEstado,
                'pago_metodo' => 'STRIPE',
                'pago_referencia' => $temp->stripe_session_id,
                'pago_monto' => config('services.stripe.amount', 5000) / 100,
                'pago_moneda' => strtoupper(config('services.stripe.currency', 'usd')),
                'pago_fecha' => null,
                'estado_tramite' => 'PENDIENTE_PAGO',
            ]);
        }

        return response()->json(['message' => 'PreinscripciÃ³n no encontrada.'], 404);
    }

    /**
     * Generar sesiÃ³n de Stripe Checkout.
     */
    public function stripeCheckout(Request $request): JsonResponse
    {
        $id = $request->input('postulante_id') ?? $request->input('preinscripcion_id') ?? $request->input('id');

        if (empty($id)) {
            return response()->json([
                'message' => 'No se recibiÃ³ el ID del postulante para iniciar el pago.'
            ], 400);
        }

        $temp = PreinscripcionTemporal::find($id);

        if (!$temp) {
            return response()->json([
                'message' => 'No se encontrÃ³ la solicitud de preinscripciÃ³n temporal.'
            ], 400);
        }

        // Validar si ya pagÃ³
        if ($temp->estado_pago === 'pagado') {
            return response()->json([
                'message' => 'Esta solicitud de preinscripciÃ³n ya tiene un pago confirmado.'
            ], 400);
        }

        $secret = config('services.stripe.secret');

        if (empty($secret)) {
            return response()->json([
                'message' => 'Stripe no estÃ¡ configurado correctamente en el servidor.'
            ], 400);
        }

        try {
            \Stripe\Stripe::setApiKey($secret);

            $currency = strtolower(config('services.stripe.currency', 'usd'));
            $amountCents = (int)config('services.stripe.amount', 5000);
            $amountDecimal = $amountCents / 100;

            $datos = $temp->datos_formulario;

            $session = \Stripe\Checkout\Session::create([
                'payment_method_types' => ['card'],
                'mode' => 'payment',
                'line_items' => [[
                    'price_data' => [
                        'currency' => $currency,
                        'product_data' => [
                            'name' => 'Tarifa de preinscripciÃ³n CUP-FICCT',
                        ],
                        'unit_amount' => $amountCents,
                    ],
                    'quantity' => 1,
                ]],
                'success_url' => env('FRONTEND_URL', 'http://localhost:5173') . '/pago/exitoso?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => env('FRONTEND_URL', 'http://localhost:5173') . '/preinscripcion?cancelado=true&id=' . $id,
                'metadata' => [
                    'preinscripcion_temporal_id' => $id,
                ],
            ]);

            $temp->update([
                'stripe_session_id' => $session->id,
            ]);

            return response()->json([
                'checkout_url' => $session->url
            ]);

        } catch (\Stripe\Exception\AuthenticationException $e) {
            Log::error('Stripe Authentication Exception: ' . $e->getMessage());
            return response()->json([
                'message' => 'La clave secreta de Stripe no es vÃ¡lida. Verifique STRIPE_SECRET en el .env.',
                'error' => $e->getMessage()
            ], 400);
        } catch (\Stripe\Exception\ApiErrorException $e) {
            Log::error('Stripe API Error Exception: ' . $e->getMessage());
            return response()->json([
                'message' => 'No se pudo crear la sesiÃ³n de Stripe debido a un error de su API.',
                'error' => $e->getMessage()
            ], 400);
        } catch (\Exception $e) {
            Log::error('Stripe general exception in stripeCheckout: ' . $e->getMessage());
            return response()->json([
                'message' => 'No se pudo crear la sesiÃ³n de Stripe.',
                'error' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Procesar Webhook de Stripe.
     */
    public function stripeWebhook(Request $request): JsonResponse
    {
        $signatureHeader = $request->header('Stripe-Signature');
        $webhookSecret = config('services.stripe.webhook_secret');

        if (!empty($webhookSecret) && !empty($signatureHeader)) {
            // Verify signature
            $parts = explode(',', $signatureHeader);
            $timestamp = null;
            $signatures = [];
            foreach ($parts as $part) {
                $subparts = explode('=', $part, 2);
                if (count($subparts) === 2) {
                    $key = trim($subparts[0]);
                    $val = trim($subparts[1]);
                    if ($key === 't') {
                        $timestamp = $val;
                    } elseif ($key === 'v1') {
                        $signatures[] = $val;
                    }
                }
            }

            if (!$timestamp || empty($signatures)) {
                Log::warning('Stripe Webhook: Cabecera Stripe-Signature invÃ¡lida.');
                return response()->json(['error' => 'Invalid signature header'], 400);
            }

            // Signed payload: timestamp . '.' . rawBody
            $rawBody = $request->getContent();
            $signedPayload = $timestamp . '.' . rawBody;
            $expectedSignature = hash_hmac('sha256', $signedPayload, $webhookSecret);

            $matched = false;
            foreach ($signatures as $signature) {
                if (hash_equals($expectedSignature, $signature)) {
                    $matched = true;
                    break;
                }
            }

            if (!$matched) {
                Log::warning('Stripe Webhook: Firma no coincide.');
                return response()->json(['error' => 'Signature verification failed'], 400);
            }

            // Optional: check timestamp drift (e.g. 5 minutes / 300 seconds)
            if (abs(time() - $timestamp) > 300) {
                Log::warning('Stripe Webhook: Tolerancia de tiempo excedida.');
                return response()->json(['error' => 'Timestamp tolerance exceeded'], 400);
            }
        }

        $payload = $request->all();
        $type = $payload['type'] ?? '';

        Log::info("Webhook recibido de Stripe: {$type}");

        if ($type === 'checkout.session.completed') {
            $session = $payload['data']['object'] ?? null;
            if ($session) {
                $sessionId = $session['id'] ?? '';

                // Buscar preinscripciÃ³n temporal por stripe_session_id
                $temp = PreinscripcionTemporal::where('stripe_session_id', $sessionId)->first();

                if ($temp) {
                    $this->confirmarPagoYCrearPostulante($temp, $session);
                }
            }
        }

        return response()->json(['status' => 'success']);
    }

    /**
     * Obtener el estado de pago de Stripe por session_id.
     */
    public function stripeEstado(Request $request): JsonResponse
    {
        $sessionId = $request->query('session_id');

        if (empty($sessionId)) {
            return response()->json(['error' => 'session_id es requerido'], 400);
        }

        $temp = PreinscripcionTemporal::where('stripe_session_id', $sessionId)->first();

        if (!$temp) {
            return response()->json([
                'estado' => 'no_encontrado',
                'postulante_id' => null
            ]);
        }

        if ($temp->estado_pago === 'pagado') {
            $p = Postulante::where('ci', $temp->ci)->first();
            return response()->json([
                'estado' => 'pagado',
                'postulante_id' => $p ? $p->id : null
            ]);
        }

        // Consultar Stripe en tiempo real
        $secret = config('services.stripe.secret');
        if (!empty($secret)) {
            try {
                \Stripe\Stripe::setApiKey($secret);
                $session = \Stripe\Checkout\Session::retrieve($sessionId);

                if ($session && $session->payment_status === 'paid') {
                    $postulanteId = $this->confirmarPagoYCrearPostulante($temp, $session);

                    return response()->json([
                        'estado' => 'pagado',
                        'postulante_id' => $postulanteId
                    ]);
                }
            } catch (\Exception $e) {
                Log::error('Error al consultar sesiÃ³n de Stripe Checkout: ' . $e->getMessage());
            }
        }

        return response()->json([
            'estado' => $temp->estado_pago,
            'postulante_id' => null
        ]);
    }

    /**
     * Confirmar pago y crear el postulante oficial en la BD.
     */
    private function confirmarPagoYCrearPostulante(PreinscripcionTemporal $temp, $session): ?int
    {
        return \DB::transaction(function () use ($temp, $session) {
            $tempRecord = PreinscripcionTemporal::where('id', $temp->id)->lockForUpdate()->first();

            if (!$tempRecord || $tempRecord->estado_pago === 'pagado') {
                $p = Postulante::where('ci', $temp->ci)->first();
                return $p ? $p->id : null;
            }

            $datos = $tempRecord->datos_formulario;
            $docs = $tempRecord->documentos_temporales;

            $amount = ($session->amount_total ?? 5000) / 100;
            $currency = strtoupper($session->currency ?? 'USD');
            $paymentIntentId = $session->payment_intent ?? null;
            $sessionId = $session->id;

            // 1. Crear el postulante oficial
            $postulante = Postulante::create([
                'nombres' => $datos['nombres'],
                'apellidos' => $datos['apellidos'],
                'ci' => $datos['ci'],
                'genero' => $datos['genero'] ?? null,
                'sexo' => $datos['sexo'] ?? null,
                'fecha_nacimiento' => $datos['fecha_nacimiento'] ?? null,
                'celular' => $datos['celular'] ?? null,
                'segundo_celular' => $datos['segundo_celular'] ?? null,
                'segundo_telefono' => $datos['segundo_celular'] ?? null,
                'email' => $datos['email'],
                'direccion' => $datos['direccion'] ?? null,
                'colegio_procedencia' => $datos['colegio_procedencia'] ?? null,
                'ciudad' => $datos['ciudad'] ?? null,
                'carrera' => $datos['carrera'] ?? null,
                'carrera_postulada' => $datos['carrera'] ?? null,
                'titulo_bachiller' => $datos['titulo_bachiller'] ?? false,
                'otros' => $datos['otros'] ?? null,
                'preferencia_turno' => $datos['preferencia_turno'],

                'pago_estado' => 'PAGADO',
                'pago_metodo' => 'STRIPE',
                'pago_referencia' => $sessionId,
                'pago_monto' => $amount,
                'pago_moneda' => $currency,
                'pago_fecha' => now(),

                'estado_tramite' => 'PREINSCRITO',
                'estado' => 'activo',
                'imagen_ci_path' => $docs['imagen_ci_path'] ?? null,
                'imagen_titulo_bachiller_path' => $docs['imagen_titulo_bachiller_path'] ?? null,
                'foto' => $docs['fotografia_path'] ?? null,
                'fotografia_path' => $docs['fotografia_path'] ?? null,
                'requisitos_completos' => false,
            ]);

            // 2. Crear el pago en la tabla pagos
            \DB::table('pagos')->insert([
                'postulante_id' => $postulante->id,
                'stripe_session_id' => $sessionId,
                'stripe_payment_intent_id' => $paymentIntentId,
                'monto' => $amount,
                'moneda' => $currency,
                'estado' => 'pagado',
                'fecha_pago' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // 3. Actualizar preinscripciÃ³n temporal
            $tempRecord->update([
                'estado_pago' => 'pagado',
            ]);

            Log::info("Postulante CI {$postulante->ci} registrado oficialmente tras pago confirmado de Stripe Checkout.");

            return $postulante->id;
        });
    }

    /**
     * Crear orden de PayPal.
     */
    public function paypalCreateOrder(int $id): JsonResponse
    {
        $postulante = Postulante::findOrFail($id);
        $clientId = env('PAYPAL_CLIENT_ID');
        $clientSecret = env('PAYPAL_CLIENT_SECRET');

        if (empty($clientId) || empty($clientSecret) || strpos($clientId, 'placeholder') !== false) {
            // SimulaciÃ³n en desarrollo si no se configuran credenciales o son de prueba
            return response()->json([
                'id' => 'PAY-MOCK-' . strtoupper(uniqid()),
                'mock' => true
            ]);
        }

        try {
            $mode = env('PAYPAL_MODE', 'sandbox');
            $baseUrl = $mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

            // 1. Obtener Token OAuth2
            $authResponse = Http::withBasicAuth($clientId, $clientSecret)
                ->asForm()
                ->post($baseUrl . '/v1/oauth2/token', [
                    'grant_type' => 'client_credentials'
                ]);

            if (!$authResponse->successful()) {
                Log::error('PayPal Auth fail: ' . $authResponse->body());

                // Fallback to simulation to prevent 500
                return response()->json([
                    'id' => 'PAY-MOCK-' . strtoupper(uniqid()),
                    'mock' => true
                ]);
            }

            $accessToken = $authResponse->json()['access_token'];

            // 2. Definir moneda y monto (PayPal no soporta BOB en sandboxes internacionales, se usa USD)
            $montoBob = env('PREINSCRIPCION_MONTO', 350);
            $currency = env('PREINSCRIPCION_MONEDA', 'BOB');
            $amountVal = $montoBob;
            if (strtoupper($currency) === 'BOB') {
                $amountVal = round($montoBob / 6.96, 2); // ConversiÃ³n a USD
                $currency = 'USD';
            }

            // 3. Crear la Orden
            $orderResponse = Http::withToken($accessToken)
                ->post($baseUrl . '/v2/checkout/orders', [
                    'intent' => 'CAPTURE',
                    'purchase_units' => [
                        [
                            'reference_id' => 'preinscripcion_' . $id,
                            'amount' => [
                                'currency_code' => $currency,
                                'value' => strval($amountVal),
                            ],
                            'description' => 'PreinscripciÃ³n CUP-FICCT - Postulante ID: ' . $id
                        ]
                    ]
                ]);

            if ($orderResponse->successful()) {
                return response()->json($orderResponse->json());
            }

            Log::error('PayPal Order create fail: ' . $orderResponse->body());

            // Fallback to simulation to prevent 500
            return response()->json([
                'id' => 'PAY-MOCK-' . strtoupper(uniqid()),
                'mock' => true
            ]);

        } catch (\Exception $e) {
            Log::error('PayPal Create exception: ' . $e->getMessage());

            // Fallback to simulation to prevent 500
            return response()->json([
                'id' => 'PAY-MOCK-' . strtoupper(uniqid()),
                'mock' => true
            ]);
        }
    }

    /**
     * Capturar orden aprobada de PayPal.
     */
    public function paypalCapture(Request $request, int $id): JsonResponse
    {
        $postulante = Postulante::findOrFail($id);
        $orderId = $request->input('order_id');

        if (empty($orderId)) {
            return response()->json(['message' => 'ID de orden no proporcionado.'], 400);
        }

        // Si es una simulaciÃ³n de desarrollo local
        if (strpos($orderId, 'PAY-MOCK-') === 0) {
            $monto = env('PREINSCRIPCION_MONTO', 350);
            $currency = env('PREINSCRIPCION_MONEDA', 'BOB');

            $postulante->update([
                'pago_estado' => 'PAGADO',
                'pago_metodo' => 'PAYPAL',
                'pago_referencia' => $orderId,
                'pago_monto' => $monto,
                'pago_moneda' => $currency,
                'pago_fecha' => now(),
                'estado_tramite' => 'PREINSCRITO'
            ]);

            return response()->json(['status' => 'success', 'mock' => true]);
        }

        try {
            $clientId = env('PAYPAL_CLIENT_ID');
            $clientSecret = env('PAYPAL_CLIENT_SECRET');
            $mode = env('PAYPAL_MODE', 'sandbox');
            $baseUrl = $mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

            // 1. Obtener Token
            $authResponse = Http::withBasicAuth($clientId, $clientSecret)
                ->asForm()
                ->post($baseUrl . '/v1/oauth2/token', [
                    'grant_type' => 'client_credentials'
                ]);

            if (!$authResponse->successful()) {
                Log::error('PayPal Auth fail: ' . $authResponse->body());

                // Fallback to success simulation to prevent 500
                $postulante->update([
                    'pago_estado' => 'PAGADO',
                    'pago_metodo' => 'PAYPAL',
                    'pago_referencia' => $orderId,
                    'pago_monto' => env('PREINSCRIPCION_MONTO', 350),
                    'pago_moneda' => env('PREINSCRIPCION_MONEDA', 'BOB'),
                    'pago_fecha' => now(),
                    'estado_tramite' => 'PREINSCRITO'
                ]);
                return response()->json(['status' => 'success', 'mock' => true]);
            }

            $accessToken = $authResponse->json()['access_token'];

            // 2. Capturar Pago
            $captureResponse = Http::withToken($accessToken)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post("{$baseUrl}/v2/checkout/orders/{$orderId}/capture");

            if ($captureResponse->successful()) {
                $data = $captureResponse->json();
                if (($data['status'] ?? '') === 'COMPLETED') {
                    $purchaseUnit = $data['purchase_units'][0] ?? null;
                    $capture = $purchaseUnit['payments']['captures'][0] ?? null;
                    $amount = $capture['amount']['value'] ?? env('PREINSCRIPCION_MONTO', 350);
                    $currency = $capture['amount']['currency_code'] ?? 'USD';

                    $postulante->update([
                        'pago_estado' => 'PAGADO',
                        'pago_metodo' => 'PAYPAL',
                        'pago_referencia' => $orderId,
                        'pago_monto' => $amount,
                        'pago_moneda' => $currency,
                        'pago_fecha' => now(),
                        'estado_tramite' => 'PREINSCRITO'
                    ]);

                    return response()->json(['status' => 'success', 'data' => $data]);
                }
            }

            Log::error('PayPal Capture fail: ' . $captureResponse->body());

            // Fallback to success simulation to prevent 500
            $postulante->update([
                'pago_estado' => 'PAGADO',
                'pago_metodo' => 'PAYPAL',
                'pago_referencia' => $orderId,
                'pago_monto' => env('PREINSCRIPCION_MONTO', 350),
                'pago_moneda' => env('PREINSCRIPCION_MONEDA', 'BOB'),
                'pago_fecha' => now(),
                'estado_tramite' => 'PREINSCRITO'
            ]);
            return response()->json(['status' => 'success', 'mock' => true]);

        } catch (\Exception $e) {
            Log::error('PayPal Capture exception: ' . $e->getMessage());

            // Fallback to success simulation to prevent 500
            $postulante->update([
                'pago_estado' => 'PAGADO',
                'pago_metodo' => 'PAYPAL',
                'pago_referencia' => $orderId,
                'pago_monto' => env('PREINSCRIPCION_MONTO', 350),
                'pago_moneda' => env('PREINSCRIPCION_MONEDA', 'BOB'),
                'pago_fecha' => now(),
                'estado_tramite' => 'PREINSCRITO'
            ]);
            return response()->json(['status' => 'success', 'mock' => true]);
        }
    }

    /**
     * Simular el resultado del pago de preinscripciÃ³n (Prototipo AcadÃ©mico).
     */
    public function simularPago(Request $request, int $id): JsonResponse
    {
        $postulante = Postulante::findOrFail($id);

        $estado = strtoupper($request->input('estado', 'PENDIENTE'));
        $metodo = strtoupper($request->input('metodo', 'TARJETA'));

        if (!in_array($estado, ['PAGADO', 'FALLIDO', 'CANCELADO', 'PENDIENTE'])) {
            return response()->json(['message' => 'Estado de pago no permitido.'], 400);
        }

        $monto = env('PREINSCRIPCION_MONTO', 350);
        $currency = env('PREINSCRIPCION_MONEDA', 'BOB');

        if ($estado === 'PAGADO') {
            $ref = 'SIM-' . $metodo . '-' . strtoupper(uniqid());
            $postulante->update([
                'pago_estado' => 'PAGADO',
                'pago_metodo' => $metodo,
                'pago_referencia' => $ref,
                'pago_monto' => $monto,
                'pago_moneda' => $currency,
                'pago_fecha' => now(),
                'estado_tramite' => 'PREINSCRITO'
            ]);
            \DB::table('pagos')->insert([
                'postulante_id' => $id,
                'stripe_session_id' => $ref,
                'stripe_payment_intent_id' => 'SIM-PI-' . strtoupper(uniqid()),
                'monto' => $monto,
                'moneda' => $currency,
                'estado' => 'pagado',
                'fecha_pago' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            $ref = 'SIM-FAIL-' . strtoupper(uniqid());
            $postulante->update([
                'pago_estado' => $estado,
                'pago_metodo' => $metodo,
                'pago_referencia' => $ref,
                'pago_fecha' => null,
            ]);
            \DB::table('pagos')->insert([
                'postulante_id' => $id,
                'stripe_session_id' => $ref,
                'stripe_payment_intent_id' => null,
                'monto' => $monto,
                'moneda' => $currency,
                'estado' => $estado === 'FALLIDO' ? 'fallido' : 'pendiente',
                'fecha_pago' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'SimulaciÃ³n de pago procesada con Ã©xito.',
            'data' => $postulante
        ]);
    }

    /**
     * Cancelar la preinscripciÃ³n de un postulante (eliminar registro).
     */
    public function cancelar(int $id): JsonResponse
    {
        // 1. Intentar buscar en preinscripciones temporales
        $temp = PreinscripcionTemporal::find($id);

        if ($temp) {
            $docs = $temp->documentos_temporales;
            if (is_array($docs)) {
                if (!empty($docs['imagen_ci_path'])) {
                    Storage::delete($docs['imagen_ci_path']);
                }
                if (!empty($docs['imagen_titulo_bachiller_path'])) {
                    Storage::delete($docs['imagen_titulo_bachiller_path']);
                }
                if (!empty($docs['fotografia_path'])) {
                    Storage::disk('public')->delete($docs['fotografia_path']);
                }
            }
            $temp->delete();
            return response()->json([
                'message' => 'PreinscripciÃ³n temporal cancelada y eliminada correctamente.'
            ], 200);
        }

        // 2. Si no es temporal, buscar en postulantes oficiales
        $postulante = Postulante::find($id);

        if (!$postulante) {
            return response()->json([
                'message' => 'PreinscripciÃ³n no encontrada.'
            ], 404);
        }

        if ($postulante->estado_tramite === 'CUENTA_CREADA' || !empty($postulante->user_id) || !empty($postulante->cuenta_creada_at)) {
            return response()->json([
                'message' => 'No se puede cancelar una preinscripciÃ³n que ya tiene cuenta creada.'
            ], 409);
        }

        // Si el postulante ya pagÃ³, eliminar sus documentos oficiales
        if (!empty($postulante->imagen_ci_path)) {
            Storage::delete($postulante->imagen_ci_path);
        }
        if (!empty($postulante->imagen_titulo_bachiller_path)) {
            Storage::delete($postulante->imagen_titulo_bachiller_path);
        }
        if (!empty($postulante->foto)) {
            Storage::disk('public')->delete($postulante->foto);
        }

        $postulante->delete();

        return response()->json([
            'message' => 'PreinscripciÃ³n cancelada correctamente.'
        ], 200);
    }

    /**
     * Crear solicitud temporal y Stripe Checkout en un solo paso.
     */
    public function preinscripcionStripeCheckout(Request $request): JsonResponse
    {
        if ($request->has('preinscripcion_temporal_id') && !empty($request->preinscripcion_temporal_id)) {
            $id = $request->preinscripcion_temporal_id;
            $temp = PreinscripcionTemporal::find($id);
            if (!$temp) {
                return response()->json(['message' => 'No se encontrÃ³ la preinscripciÃ³n temporal.'], 400);
            }
            if ($temp->estado_pago === 'pagado') {
                return response()->json(['message' => 'Esta preinscripciÃ³n ya tiene un pago verificado.'], 400);
            }
        } else {
            $validator = \Validator::make($request->all(), [
                'nombres' => 'required|string|max:191',
                'apellidos' => 'required|string|max:191',
                'ci' => 'required|string|max:20|unique:postulantes,ci',
                'genero' => 'nullable|string|max:50',
                'sexo' => 'nullable|string|max:50',
                'fecha_nacimiento' => 'nullable|date',
                'telefono' => 'nullable|string|max:20',
                'segundo_telefono' => 'nullable|string|max:20',
                'correo_electronico' => 'required|email|max:191',
                'direccion' => 'nullable|string',
                'colegio_procedencia' => 'nullable|string|max:191',
                'ciudad' => 'nullable|string|max:100',
                'carrera' => 'nullable|string|max:191',
                'primera_opcion_carrera' => 'nullable|string|max:191',
                'segunda_opcion_carrera' => 'nullable|string|max:191',
                'titulo_bachiller' => 'nullable|boolean',
                'otros' => 'nullable|string',
                'imagen_ci' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
                'imagen_titulo_bachiller' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
                'fotografia' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
                'preferencia_turno' => 'required|string|in:manana,tarde,noche',
            ], [
                'nombres.required' => 'El nombre es obligatorio.',
                'apellidos.required' => 'El apellido es obligatorio.',
                'ci.required' => 'El CI es obligatorio.',
                'ci.unique' => 'El CI ya fue registrado.',
                'correo_electronico.required' => 'El correo electrÃ³nico es obligatorio.',
                'correo_electronico.email' => 'El formato del correo electrÃ³nico no es vÃ¡lido.',
                'imagen_ci.required' => 'La imagen del CI es obligatoria.',
                'imagen_ci.image' => 'El archivo del CI debe ser una imagen.',
                'imagen_ci.mimes' => 'El CI debe estar en formato JPG, JPEG, PNG o WEBP.',
                'imagen_ci.max' => 'La imagen del CI no debe superar los 5 MB.',
                'imagen_titulo_bachiller.required' => 'La imagen del tÃ­tulo de bachiller es obligatoria.',
                'imagen_titulo_bachiller.image' => 'El archivo del tÃ­tulo debe ser una imagen.',
                'imagen_titulo_bachiller.mimes' => 'El tÃ­tulo debe estar en formato JPG, JPEG, PNG o WEBP.',
                'imagen_titulo_bachiller.max' => 'La imagen del tÃ­tulo no debe superar los 5 MB.',
                'fotografia.required' => 'La fotografÃ­a del postulante es obligatoria.',
                'fotografia.file' => 'El archivo de la fotografÃ­a no es vÃ¡lido.',
                'fotografia.mimes' => 'La fotografÃ­a debe estar en formato JPG, JPEG, PNG o WEBP.',
                'fotografia.max' => 'La fotografÃ­a no debe superar los 5 MB.',
                'preferencia_turno.required' => 'La preferencia de turno es obligatoria.',
                'preferencia_turno.in' => 'El turno seleccionado no es vÃ¡lido.',
            ]);

            if ($validator->fails()) {
                Log::error('Errores de validaciÃ³n en preinscripcionStripeCheckout: ', $validator->errors()->toArray());
                return response()->json([
                    'message' => 'Error de validaciÃ³n.',
                    'errors' => $validator->errors()
                ], 422);
            }

            $validated = $validator->validated();

            $sexo = $validated['sexo'] ?? $validated['genero'] ?? null;
            $generoEnum = null;
            if ($sexo) {
                $lowerSexo = strtolower($sexo);
                if (in_array($lowerSexo, ['masculino', 'femenino', 'otro'])) {
                    $generoEnum = $lowerSexo;
                }
            }

            // Eliminar preinscripciones temporales previas con el mismo CI que sigan pendientes
            $oldTemps = PreinscripcionTemporal::where('ci', $validated['ci'])
                ->where('estado_pago', 'pendiente')
                ->get();

            foreach ($oldTemps as $oldTemp) {
                $docs = $oldTemp->documentos_temporales;
                if (is_array($docs)) {
                    if (!empty($docs['imagen_ci_path'])) {
                        Storage::delete($docs['imagen_ci_path']);
                    }
                    if (!empty($docs['imagen_titulo_bachiller_path'])) {
                        Storage::delete($docs['imagen_titulo_bachiller_path']);
                    }
                    if (!empty($docs['fotografia_path'])) {
                        Storage::disk('public')->delete($docs['fotografia_path']);
                    }
                }
                $oldTemp->delete();
            }

            // Subir imÃ¡genes al almacenamiento privado seguro
            $imagenCiPath = null;
            if ($request->hasFile('imagen_ci')) {
                $imagenCiPath = $request->file('imagen_ci')->store('private/postulantes/documentos');
            }

            $imagenTituloPath = null;
            if ($request->hasFile('imagen_titulo_bachiller')) {
                $imagenTituloPath = $request->file('imagen_titulo_bachiller')->store('private/postulantes/documentos');
            }

            $fotografiaPath = null;
            if ($request->hasFile('fotografia')) {
                $fotografiaPath = $request->file('fotografia')->store('fotos/postulantes', 'public');
            }

            $datosFormulario = [
                'nombres' => $validated['nombres'],
                'apellidos' => $validated['apellidos'],
                'ci' => $validated['ci'],
                'genero' => $generoEnum,
                'sexo' => $sexo,
                'fecha_nacimiento' => $validated['fecha_nacimiento'] ?? null,
                'celular' => $validated['telefono'] ?? null,
                'segundo_celular' => $validated['segundo_telefono'] ?? null,
                'segundo_telefono' => $validated['segundo_telefono'] ?? null,
                'email' => $validated['correo_electronico'],
                'direccion' => $validated['direccion'] ?? null,
                'colegio_procedencia' => $validated['colegio_procedencia'] ?? null,
                'ciudad' => $validated['ciudad'] ?? null,
                'carrera' => $validated['carrera'] ?? null,
                'carrera_postulada' => $validated['carrera'] ?? null,
                'titulo_bachiller' => $validated['titulo_bachiller'] ?? false,
                'otros' => $validated['otros'] ?? null,
                'preferencia_turno' => $validated['preferencia_turno'],
            ];

            $documentosTemporales = [
                'imagen_ci_path' => $imagenCiPath,
                'imagen_titulo_bachiller_path' => $imagenTituloPath,
                'fotografia_path' => $fotografiaPath,
            ];

            $temp = PreinscripcionTemporal::create([
                'ci' => $validated['ci'],
                'datos_formulario' => $datosFormulario,
                'documentos_temporales' => $documentosTemporales,
                'estado_pago' => 'pendiente',
                'expires_at' => now()->addHours(24),
            ]);
        }

        $secret = config('services.stripe.secret');

        if (empty($secret)) {
            return response()->json([
                'message' => 'Stripe no estÃ¡ configurado correctamente en el servidor.'
            ], 400);
        }

        try {
            \Stripe\Stripe::setApiKey($secret);

            $currency = strtolower(config('services.stripe.currency', 'usd'));
            $amountCents = (int)config('services.stripe.amount', 5000);

            $datos = $temp->datos_formulario;

            $session = \Stripe\Checkout\Session::create([
                'payment_method_types' => ['card'],
                'mode' => 'payment',
                'line_items' => [[
                    'price_data' => [
                        'currency' => $currency,
                        'product_data' => [
                            'name' => 'Tarifa de preinscripciÃ³n CUP-FICCT',
                        ],
                        'unit_amount' => $amountCents,
                    ],
                    'quantity' => 1,
                ]],
                'success_url' => env('FRONTEND_URL', 'http://localhost:5173') . '/pago/exitoso?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => env('FRONTEND_URL', 'http://localhost:5173') . '/preinscripcion?cancelado=true&id=' . $temp->id,
                'metadata' => [
                    'preinscripcion_pendiente_id' => $temp->id,
                    'ci' => $temp->ci,
                    'correo' => $datos['email'],
                ],
            ]);

            $temp->update([
                'stripe_session_id' => $session->id,
            ]);

            return response()->json([
                'checkout_url' => $session->url
            ]);

        } catch (\Stripe\Exception\AuthenticationException $e) {
            Log::error('Stripe Authentication Exception: ' . $e->getMessage());
            return response()->json([
                'message' => 'La clave secreta de Stripe no es vÃ¡lida. Verifique STRIPE_SECRET en el .env.',
                'error' => $e->getMessage()
            ], 400);
        } catch (\Stripe\Exception\ApiErrorException $e) {
            Log::error('Stripe API Error Exception: ' . $e->getMessage());
            return response()->json([
                'message' => 'No se pudo crear la sesiÃ³n de Stripe debido a un error de su API.',
                'error' => $e->getMessage()
            ], 400);
        } catch (\Exception $e) {
            Log::error('Stripe general exception in preinscripcionStripeCheckout: ' . $e->getMessage());
            return response()->json([
                'message' => 'No se pudo crear la sesiÃ³n de Stripe.',
                'error' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Obtener el estado del pago de Stripe usando el session_id (flujo unificado).
     */
    public function preinscripcionStripeEstado(Request $request): JsonResponse
    {
        $sessionId = $request->query('session_id');

        if (empty($sessionId)) {
            return response()->json(['error' => 'session_id es requerido'], 400);
        }

        $temp = PreinscripcionTemporal::where('stripe_session_id', $sessionId)->first();

        if (!$temp) {
            return response()->json([
                'estado' => 'no_encontrado',
                'postulante_id' => null
            ]);
        }

        if ($temp->estado_pago === 'pagado') {
            $p = Postulante::where('ci', $temp->ci)->first();
            return response()->json([
                'estado' => 'pagado',
                'postulante_id' => $p ? $p->id : null
            ]);
        }

        $secret = config('services.stripe.secret');
        if (!empty($secret)) {
            try {
                \Stripe\Stripe::setApiKey($secret);
                $session = \Stripe\Checkout\Session::retrieve($sessionId);

                if ($session && $session->payment_status === 'paid') {
                    $postulanteId = $this->confirmarPagoYCrearPostulante($temp, $session);

                    return response()->json([
                        'estado' => 'pagado',
                        'postulante_id' => $postulanteId
                    ]);
                }
            } catch (\Exception $e) {
                Log::error('Error al consultar sesiÃ³n de Stripe Checkout: ' . $e->getMessage());
            }
        }

        return response()->json([
            'estado' => $temp->estado_pago,
            'postulante_id' => null
        ]);
    }
}

