<?php

namespace Modules\P2_ParticipantesGrupos\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Postulante;
use Modules\P1_SeguridadAdministracion\Services\CuentaPostulanteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PreinscripcionAdminController extends Controller
{
    protected CuentaPostulanteService $cuentaService;

    public function __construct(CuentaPostulanteService $cuentaService)
    {
        $this->cuentaService = $cuentaService;
    }

    /**
     * Listar preinscritos con búsqueda y paginación.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Postulante::query();

        // Mostrar solo registros con pago confirmado (PREINSCRITO) o ya con cuenta (INSCRITO)
        $query->whereIn('estado_tramite', ['PREINSCRITO', 'INSCRITO']);

        // Buscar por CI, Nombres, Apellidos, Correo
        if ($request->has('search') && !empty($request->search)) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('nombres', 'ilike', "%{$s}%")
                  ->orWhere('apellidos', 'ilike', "%{$s}%")
                  ->orWhere('ci', 'ilike', "%{$s}%")
                  ->orWhere('email', 'ilike', "%{$s}%");
            });
        }

        // Ordenar y paginar
        $data = $query->orderBy('created_at', 'desc')->paginate(15);

        return response()->json($data);
    }

    /**
     * Exportar CSV de preinscritos.
     */
    public function exportarCsv(): StreamedResponse
    {
        $headers = [
            "Content-type"        => "text/csv; charset=UTF-8",
            "Content-Disposition" => "attachment; filename=preinscripciones_" . date('Ymd_His') . ".csv",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $callback = function() {
            $file = fopen('php://output', 'w');
            
            // Agregar BOM UTF-8 para compatibilidad total con Excel en español
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));

            // Cabeceras del CSV
            fputcsv($file, [
                'CI', 'Nombres', 'Apellidos', 'Género/Sexo', 'Fecha de nacimiento',
                'Teléfono', 'Segundo teléfono', 'Correo electrónico', 'Dirección',
                'Colegio', 'Ciudad', 'Carrera', 'Título bachiller', 'Estado trámite',
                'Código usuario', 'Fecha de cuenta creada', 'Fecha de correo enviado'
            ], ';');

            $postulantes = Postulante::whereIn('estado_tramite', ['PREINSCRITO', 'INSCRITO'])->orderBy('created_at', 'desc')->get();

            foreach ($postulantes as $p) {
                fputcsv($file, [
                    $p->ci,
                    $p->nombres,
                    $p->apellidos,
                    $p->sexo ?? $p->genero ?? '',
                    $p->fecha_nacimiento ? $p->fecha_nacimiento->format('Y-m-d') : '',
                    $p->celular ?? '',
                    $p->segundo_telefono ?? $p->segundo_celular ?? '',
                    $p->email,
                    $p->direccion ?? '',
                    $p->colegio_procedencia ?? '',
                    $p->ciudad ?? '',
                    $p->carrera ?? $p->carrera_postulada ?? '',
                    $p->titulo_bachiller ? 'SÍ' : 'NO',
                    $p->estado_tramite ?? 'PREINSCRITO',
                    $p->codigo_usuario ?? '',
                    $p->cuenta_creada_at ? $p->cuenta_creada_at->format('Y-m-d H:i:s') : '',
                    $p->correo_enviado_at ? $p->correo_enviado_at->format('Y-m-d H:i:s') : '',
                ], ';');
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Generar cuenta para un postulante de forma individual.
     */
    public function generarCuenta(int $id): JsonResponse
    {
        try {
            $postulante = Postulante::findOrFail($id);
            if (!$postulante->requisitos_completos) {
                return response()->json([
                    'message' => 'Faltan documentos obligatorios.'
                ], 400);
            }
            $user = $this->cuentaService->crearCuenta($postulante);

            return response()->json([
                'message' => 'Cuenta creada y enviada con éxito.',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'codigo' => $user->codigo,
                ],
                'postulante' => $postulante
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Generar cuentas de forma masiva para todos los postulantes preinscritos.
     */
    public function generarCuentasMasivo(): JsonResponse
    {
        $postulantes = Postulante::whereNull('user_id')->where('pago_estado', 'PAGADO')->get();
        $exitosas = 0;
        $fallidas = 0;
        $errores = [];

        foreach ($postulantes as $p) {
            try {
                if (!$p->requisitos_completos) {
                    throw new \Exception('Faltan documentos obligatorios.');
                }
                $this->cuentaService->crearCuenta($p);
                $exitosas++;
            } catch (\Exception $e) {
                $fallidas++;
                $errores[] = "CI {$p->ci}: " . $e->getMessage();
            }
        }

        return response()->json([
            'message' => "Proceso masivo completado. Cuentas creadas: {$exitosas}. Fallidas: {$fallidas}.",
            'exitosas' => $exitosas,
            'fallidas' => $fallidas,
            'errores' => $errores
        ]);
    }

    /**
     * Descargar documento privado de un postulante (CI, Título de Bachiller o Foto).
     */
    public function descargarDocumento(int $id, string $type): \Symfony\Component\HttpFoundation\BinaryFileResponse|\Illuminate\Http\JsonResponse
    {
        $postulante = Postulante::findOrFail($id);

        $path = null;
        $disk = 'local';
        if ($type === 'ci') {
            $path = $postulante->imagen_ci_path;
        } elseif ($type === 'titulo') {
            $path = $postulante->imagen_titulo_bachiller_path;
        } elseif ($type === 'foto') {
            $path = $postulante->fotografia_path ?: $postulante->foto;
            $disk = 'public';
        }

        if (empty($path) || !\Illuminate\Support\Facades\Storage::disk($disk)->exists($path)) {
            return response()->json(['message' => 'El archivo solicitado no existe o no fue cargado.'], 404);
        }

        $fullPath = \Illuminate\Support\Facades\Storage::disk($disk)->path($path);
        
        return response()->file($fullPath);
    }
}
