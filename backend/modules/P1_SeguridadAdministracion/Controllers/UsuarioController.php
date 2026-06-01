<?php

namespace Modules\P1_SeguridadAdministracion\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Role;
use Modules\P4_ReportesMonitoreoAuditoria\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UsuarioController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = $request->input('search');

        $query = User::with('role')
            ->whereHas('role', function ($q) {
                $q->whereNotIn('name', ['postulante', 'administrador']);
            });

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%")
                  ->orWhere('ci', 'ilike', "%{$search}%")
                  ->orWhere('codigo', 'ilike', "%{$search}%");
            });
        }

        return response()->json(
            $query->orderBy('created_at', 'desc')->paginate(15)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name'    => 'required|string|max:191',
            'email'   => 'required|email|unique:users,email',
            'ci'      => 'required|string|unique:users,ci',
            'role_id' => 'required|exists:roles,id',
            'estado'  => 'nullable|in:activo,inactivo',
        ]);

        $ci       = $request->ci;
        $roleName = Role::find($request->role_id)?->name;

        // Docentes: contraseña = "2026" + CI invertido (igual al registro); otros roles: contraseña = CI
        $password = ($roleName === 'docente')
            ? Hash::make('2026' . strrev($ci))
            : Hash::make($ci);

        $user = User::create([
            'name'                 => $request->name,
            'email'                => $request->email,
            'ci'                   => $ci,
            'password'             => $password,
            'role_id'              => $request->role_id,
            'estado'               => $request->input('estado', 'activo'),
            'codigo'               => '2026' . strrev($ci), // registro = 2026 + CI invertido
            'must_change_password' => false,
        ]);

        AuditoriaService::registrar(
            $request->user()->id,
            'Registró un usuario',
            'Usuarios',
            $request,
            "Usuario: {$user->name} (CI: {$ci})"
        );

        return response()->json($user->load('role'), 201);
    }

    public function show(int $id): JsonResponse
    {
        $user = User::with('role')->findOrFail($id);
        return response()->json($user);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $request->validate([
            'name'    => 'required|string|max:191',
            'email'   => "required|email|unique:users,email,{$id}",
            'ci'      => "nullable|string|unique:users,ci,{$id}",
            'role_id' => 'required|exists:roles,id',
            'estado'  => 'nullable|in:activo,inactivo',
        ]);

        $user->update($request->only(['name', 'email', 'ci', 'role_id', 'estado']));

        AuditoriaService::registrar(
            $request->user()->id,
            'Editó un usuario',
            'Usuarios',
            $request,
            "Usuario: {$user->name}"
        );

        return response()->json($user->load('role'));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $tipoOrigen = $request->input('tipo_origen');

        if ($tipoOrigen === 'postulante') {
            $postulante = \App\Models\Postulante::find($id);
            if (!$postulante) {
                return response()->json(['message' => 'Postulante no encontrado'], 404);
            }

            if ($postulante->user_id) {
                $user = User::find($postulante->user_id);
                if ($user) {
                    $user->update(['estado' => 'inactivo']);
                }
                $postulante->update(['estado_tramite' => 'INACTIVO']);
                
                AuditoriaService::registrar(
                    $request->user()->id,
                    'Desactivó un usuario (postulante)',
                    'Usuarios',
                    $request,
                    "Postulante: {$postulante->nombres} {$postulante->apellidos}"
                );
                return response()->json(['message' => 'Cuenta de postulante desactivada (estado INACTIVO).']);
            } else {
                $name = trim($postulante->nombres . ' ' . $postulante->apellidos);
                $postulante->delete();
                
                AuditoriaService::registrar(
                    $request->user()->id,
                    'Eliminó postulante preinscrito',
                    'Usuarios',
                    $request,
                    "Postulante: {$name}"
                );
                return response()->json(['message' => 'Postulante preinscrito eliminado.']);
            }
        } else {
            $user = User::find($id);
            if (!$user) {
                return response()->json(['message' => 'Usuario no encontrado'], 404);
            }

            $name = $user->name;
            
            $postulante = \App\Models\Postulante::where('user_id', $user->id)
                ->orWhere('ci', $user->ci)
                ->first();
            if ($postulante) {
                $postulante->update(['estado_tramite' => 'INACTIVO']);
            }
            
            $user->update(['estado' => 'inactivo']);

            AuditoriaService::registrar(
                $request->user()->id,
                'Desactivó un usuario',
                'Usuarios',
                $request,
                "Usuario: {$name}"
            );

            return response()->json(['message' => 'Usuario desactivado (estado INACTIVO).']);
        }
    }

    public function activate(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $user->update(['estado' => 'activo']);

        AuditoriaService::registrar($request->user()->id, 'Activó un usuario', 'Usuarios', $request, "Usuario: {$user->name}");

        return response()->json($user->load('role'));
    }

    public function deactivate(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $user->update(['estado' => 'inactivo']);

        AuditoriaService::registrar($request->user()->id, 'Inactivó un usuario', 'Usuarios', $request, "Usuario: {$user->name}");

        return response()->json($user->load('role'));
    }

    public function changePassword(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::findOrFail($id);
        $user->update(['password' => Hash::make($request->password)]);

        AuditoriaService::registrar($request->user()->id, 'Cambió contraseña de usuario', 'Usuarios', $request, "Usuario: {$user->name}");

        return response()->json(['message' => 'Contraseña actualizada.']);
    }

    public function roles(): JsonResponse
    {
        return response()->json(
            Role::whereNotIn('name', ['postulante', 'administrador'])->get()
        );
    }

    public function exportarCsv(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $search = $request->input('search');
        $rol = $request->input('rol');

        // 1. Consulta de Users
        $usersQuery = User::with(['role', 'postulante']);

        if (!empty($rol)) {
            $rolParam = strtolower($rol);
            if ($rolParam === 'coordinador académico' || $rolParam === 'coordinador academico' || $rolParam === 'coordinador') {
                $rolParam = 'coordinador';
            } elseif ($rolParam === 'autoridad académica' || $rolParam === 'autoridad academica' || $rolParam === 'autoridad') {
                $rolParam = 'autoridad';
            }
            $usersQuery->whereHas('role', function ($q) use ($rolParam) {
                $q->where('name', $rolParam);
            });
        }

        if (!empty($search)) {
            $usersQuery->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%")
                  ->orWhere('ci', 'ilike', "%{$search}%")
                  ->orWhere('codigo', 'ilike', "%{$search}%")
                  ->orWhereHas('role', function ($qr) use ($search) {
                      $qr->where('name', 'ilike', "%{$search}%");
                  });
            });
        }

        $users = $usersQuery->get()->map(function ($u) {
            $parts = explode(' ', trim($u->name));
            $nombres = $parts[0] ?? '';
            $apellidos = count($parts) > 1 ? implode(' ', array_slice($parts, 1)) : '';

            $rolName = $u->role->name ?? '';
            if ($rolName === 'coordinador') {
                $rolDisplay = 'Coordinador Académico';
            } elseif ($rolName === 'autoridad') {
                $rolDisplay = 'Autoridad Académica';
            } else {
                $rolDisplay = ucfirst($rolName);
            }

            $estado = $u->estado ?? 'activo';
            if (strtolower($rolName) === 'postulante') {
                $postulante = $u->postulante;
                if ($postulante && $postulante->estado_tramite) {
                    $estado = $postulante->estado_tramite;
                } else {
                    $estado = 'CUENTA_CREADA';
                }
            }

            $pagoEstado = 'NO_APLICA';
            if (strtolower($rolName) === 'postulante') {
                $pagoEstado = $u->postulante->pago_estado ?? 'PENDIENTE';
            }

            return [
                'id' => $u->id,
                'tipo_origen' => 'user',
                'postulante_id' => $u->postulante->id ?? null,
                'user_id' => $u->id,
                'nombres' => $nombres,
                'apellidos' => $apellidos,
                'nombre_completo' => $u->name,
                'ci' => $u->ci,
                'email' => $u->email,
                'rol' => $rolDisplay,
                'registro' => $u->codigo ?: 'Sin registro',
                'estado' => $estado,
                'created_at' => $u->created_at,
                'pago_estado' => $pagoEstado,
            ];
        });

        // 2. Consulta de Postulantes sin cuenta (solo si el rol es todos/vacio o postulante)
        $postulantes = collect();
        if (empty($rol) || strtolower($rol) === 'postulante') {
            $postQuery = \App\Models\Postulante::whereNull('user_id');

            if (!empty($search)) {
                $postQuery->where(function ($q) use ($search) {
                    $q->where('nombres', 'ilike', "%{$search}%")
                      ->orWhere('apellidos', 'ilike', "%{$search}%")
                      ->orWhere('ci', 'ilike', "%{$search}%")
                      ->orWhere('email', 'ilike', "%{$search}%")
                      ->orWhere(\Illuminate\Support\Facades\DB::raw("nombres || ' ' || apellidos"), 'ilike', "%{$search}%");
                });
            }

            $postulantes = $postQuery->get()->map(function ($p) {
                return [
                    'id' => $p->id,
                    'tipo_origen' => 'postulante',
                    'postulante_id' => $p->id,
                    'user_id' => null,
                    'nombres' => $p->nombres,
                    'apellidos' => $p->apellidos,
                    'nombre_completo' => trim($p->nombres . ' ' . $p->apellidos),
                    'ci' => $p->ci,
                    'email' => $p->email,
                    'rol' => 'Postulante',
                    'registro' => 'Sin registro',
                    'estado' => $p->estado_tramite ?: 'PREINSCRITO',
                    'created_at' => $p->created_at,
                    'pago_estado' => $p->pago_estado ?? 'PENDIENTE',
                ];
            });
        }

        // 3. Combinar colecciones y ordenar por fecha descendente
        $combined = $users->concat($postulantes)->sortByDesc('created_at')->values();

        $estadoParam = $request->input('estado');
        if (!empty($estadoParam)) {
            $est = strtoupper($estadoParam);
            $combined = $combined->filter(function ($item) use ($est) {
                return strtoupper($item['estado'] ?? '') === $est;
            })->values();
        }

        $headers = [
            "Content-type"        => "text/csv; charset=UTF-8",
            "Content-Disposition" => "attachment; filename=usuarios_" . date('Ymd_His') . ".csv",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $callback = function() use ($combined) {
            $file = fopen('php://output', 'w');
            
            // Agregar BOM UTF-8
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));

            // Cabeceras del CSV
            fputcsv($file, [
                'nombres', 'apellidos', 'nombre_completo', 'ci', 'correo_electronico', 'rol', 'registro', 'estado', 'pago_estado'
            ], ';');

            foreach ($combined as $u) {
                fputcsv($file, [
                    $u['nombres'],
                    $u['apellidos'],
                    $u['nombre_completo'],
                    $u['ci'] ?? '',
                    $u['email'] ?? $u['correo_electronico'] ?? '',
                    $u['rol'],
                    $u['registro'],
                    $u['estado'],
                    $u['pago_estado'] ?? 'NO_APLICA',
                ], ';');
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function importarCsvYGenerarCuentas(Request $request): JsonResponse
    {
        $request->validate([
            'archivo' => 'required|file|mimes:csv,txt',
            'perfil' => 'required|string',
        ]);

        $perfil = $request->input('perfil');
        if (strtolower($perfil) === 'otro' || strtolower($perfil) === 'csv') {
            return response()->json(['message' => 'El perfil seleccionado no es válido (no se permite "Otro").'], 422);
        }

        $file = $request->file('archivo');
        $handle = fopen($file->getRealPath(), 'r');
        if (!$handle) {
            return response()->json(['message' => 'No se pudo abrir el archivo CSV.'], 400);
        }

        // Auto-detectar delimitador
        $delimiter = ';';
        $firstLine = fgets($handle);
        if ($firstLine !== false) {
            $semicolons = substr_count($firstLine, ';');
            $commas = substr_count($firstLine, ',');
            if ($commas > $semicolons) {
                $delimiter = ',';
            }
            rewind($handle);
        }

        $headers = fgetcsv($handle, 0, $delimiter);
        if (!$headers) {
            fclose($handle);
            return response()->json(['message' => 'El archivo CSV está vacío.'], 400);
        }

        // Remover BOM si existiera
        if (substr($headers[0], 0, 3) === "\xEF\xBB\xBF") {
            $headers[0] = substr($headers[0], 3);
        }

        // Normalizar los nombres de las columnas
        $headerMap = [];
        foreach ($headers as $index => $header) {
            $normalized = strtolower(trim($header));
            $normalized = trim($normalized, "\"'");
            
            if ($normalized === 'nombres' || $normalized === 'nombre') {
                $headerMap['nombres'] = $index;
            } elseif ($normalized === 'apellidos' || $normalized === 'apellido') {
                $headerMap['apellidos'] = $index;
            } elseif ($normalized === 'nombre_completo' || $normalized === 'nombre completo') {
                $headerMap['nombre_completo'] = $index;
            } elseif ($normalized === 'ci' || $normalized === 'carnet') {
                $headerMap['ci'] = $index;
            } elseif ($normalized === 'correo_electronico' || $normalized === 'correo' || $normalized === 'email') {
                $headerMap['correo_electronico'] = $index;
            } elseif ($normalized === 'codigo_usuario' || $normalized === 'codigo' || $normalized === 'registro') {
                $headerMap['registro'] = $index;
            } elseif ($normalized === 'anio_ingreso' || $normalized === 'año_ingreso' || $normalized === 'gestion' || $normalized === 'gestion_academica') {
                $headerMap['anio_ingreso'] = $index;
            } elseif ($normalized === 'pago_estado' || $normalized === 'realizo_pago' || $normalized === 'realizó_pago' || $normalized === 'pago' || $normalized === 'pagado') {
                $headerMap['pago_estado'] = $index;
            }
        }

        // Validar columnas mínimas requeridas
        $hasNombresApellidos = isset($headerMap['nombres']) && isset($headerMap['apellidos']);
        $hasNombreCompleto = isset($headerMap['nombre_completo']);
        $hasCi = isset($headerMap['ci']);
        $hasEmail = isset($headerMap['correo_electronico']);

        if ((!$hasNombresApellidos && !$hasNombreCompleto) || !$hasCi || !$hasEmail) {
            fclose($handle);
            return response()->json([
                'message' => 'El CSV debe contener nombres y apellidos, o nombre_completo, además de ci y correo_electronico.'
            ], 400);
        }

        // Si es postulante, la columna de pago es obligatoria
        if (strtolower($perfil) === 'postulante' && !isset($headerMap['pago_estado'])) {
            fclose($handle);
            return response()->json([
                'message' => 'Para generar cuentas de postulantes, el CSV debe incluir la columna pago_estado o realizo_pago con valor PAGADO.'
            ], 400);
        }

        $total = 0;
        $creadas = 0;
        $omitidas = 0;
        $correosEnviados = 0;
        $correosFallidos = 0;
        $errores = [];

        $cuentaService = new \Modules\P1_SeguridadAdministracion\Services\CuentaUsuarioService();

        while (($row = fgetcsv($handle, 0, $delimiter)) !== FALSE) {
            // Ignorar filas completamente vacías
            if (empty($row) || (count($row) === 1 && empty($row[0]))) {
                continue;
            }

            $total++;
            $filaNum = $total + 1; // Fila 1 es la cabecera

            $nombres = isset($headerMap['nombres']) && isset($row[$headerMap['nombres']]) ? trim($row[$headerMap['nombres']]) : '';
            $apellidos = isset($headerMap['apellidos']) && isset($row[$headerMap['apellidos']]) ? trim($row[$headerMap['apellidos']]) : '';
            $ci = isset($headerMap['ci']) && isset($row[$headerMap['ci']]) ? trim($row[$headerMap['ci']]) : '';
            $email = isset($headerMap['correo_electronico']) && isset($row[$headerMap['correo_electronico']]) ? trim($row[$headerMap['correo_electronico']]) : '';

            if (empty($nombres) && empty($apellidos) && isset($headerMap['nombre_completo']) && isset($row[$headerMap['nombre_completo']])) {
                $fullName = trim($row[$headerMap['nombre_completo']]);
                $parts = explode(' ', $fullName);
                $nombres = $parts[0] ?? '';
                $apellidos = count($parts) > 1 ? implode(' ', array_slice($parts, 1)) : '';
            }

            // Validar postulantes obligatorios
            if (strtolower($perfil) === 'postulante') {
                if (empty($ci)) {
                    $omitidas++;
                    $errores[] = "Fila {$filaNum}: CI es obligatorio para postulantes.";
                    continue;
                }
                if (empty($email)) {
                    $omitidas++;
                    $errores[] = "CI {$ci}: correo electrónico es obligatorio para postulantes.";
                    continue;
                }

                $pagoRaw = isset($headerMap['pago_estado']) && isset($row[$headerMap['pago_estado']]) ? trim($row[$headerMap['pago_estado']]) : '';
                if (empty($pagoRaw)) {
                    $omitidas++;
                    $errores[] = "No se creó la cuenta del postulante con CI {$ci} porque no tiene pago confirmado.";
                    continue;
                }

                $pagoUpper = strtoupper($pagoRaw);
                $esPagado = in_array($pagoUpper, ['PAGADO', 'SI', 'SÍ', 'SI_PAGO', 'SÍ_PAGO', 'TRUE', '1']);
                if (!$esPagado) {
                    $omitidas++;
                    $errores[] = "No se creó la cuenta del postulante con CI {$ci} porque no tiene pago confirmado.";
                    continue;
                }
            }

            try {
                $datos = [
                    'nombres' => $nombres,
                    'apellidos' => $apellidos,
                    'ci' => $ci,
                    'correo_electronico' => $email,
                    'anio_ingreso' => isset($headerMap['anio_ingreso']) && isset($row[$headerMap['anio_ingreso']]) ? intval(trim($row[$headerMap['anio_ingreso']])) : null,
                ];

                $cuentaService->crearCuentaDesdeDatos($datos, $perfil);
                $creadas++;
                $correosEnviados++;
            } catch (\Exception $e) {
                $mensaje = $e->getMessage();
                $ciStr = !empty($ci) ? "CI {$ci}" : "Fila {$filaNum}";
                
                if (strpos($mensaje, 'CI duplicado') !== false || strpos($mensaje, 'Correo duplicado') !== false || strpos($mensaje, 'Registro duplicado') !== false) {
                    $omitidas++;
                    $errores[] = "{$ciStr}: {$mensaje}";
                } elseif (stripos($mensaje, 'correo no enviado') !== false) {
                    $creadas++;
                    $correosFallidos++;
                    $errores[] = "{$ciStr}: {$mensaje}";
                } else {
                    $errores[] = "{$ciStr}: {$mensaje}";
                }
            }
        }
        fclose($handle);

        // Registrar acción en auditoría
        AuditoriaService::registrar(
            $request->user()->id,
            'Importó cuentas masivamente desde CSV',
            'Usuarios',
            $request,
            "Total: {$total}, Creadas: {$creadas}, Omitidas: {$omitidas}, Errores: " . count($errores)
        );

        return response()->json([
            'message' => 'Proceso finalizado',
            'total' => $total,
            'creadas' => $creadas,
            'creados' => $creadas,
            'omitidas' => $omitidas,
            'omitidos' => $omitidas,
            'correos_enviados' => $correosEnviados,
            'correos_fallidos' => $correosFallidos,
            'errores' => $errores,
        ]);
    }
}
