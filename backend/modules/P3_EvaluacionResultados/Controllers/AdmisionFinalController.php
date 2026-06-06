<?php

namespace Modules\P3_EvaluacionResultados\Controllers;

use App\Http\Controllers\Controller;
use App\Models\AdmisionResultado;
use App\Models\CupoCarrera;
use App\Models\Materia;
use App\Models\Postulante;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class AdmisionFinalController extends Controller
{
    /**
     * Palabras clave (subcadenas) para identificar cada materia obligatoria.
     * Case-insensitive via stripos.
     */
    private array $materiaKeys = [
        'computacion' => ['comput'],
        'matematicas' => ['matem'],
        'ingles'      => ['ingl'],
        'fisica'      => ['fís', 'fis'],   // Física / Fisica
    ];

    /**
     * Tracker de cupos en memoria durante el procesamiento.
     * [carrera_lower => ['max' => int, 'ocupados' => int, 'key_original' => string]]
     */
    private array $cuposTracker = [];

    // ── Gestiones disponibles ─────────────────────────────────────────────────

    public function gestiones(): JsonResponse
    {
        $gestiones = CupoCarrera::select('gestion')
            ->distinct()
            ->orderBy('gestion', 'desc')
            ->pluck('gestion');

        return response()->json($gestiones);
    }

    // ── Resultados con filtros ────────────────────────────────────────────────

    public function resultados(Request $request): JsonResponse
    {
        $resultados = AdmisionResultado::with('postulante')
            ->when($request->filled('gestion'),         fn($q) => $q->where('gestion', $request->gestion))
            ->when($request->filled('estado_academico'), fn($q) => $q->where('estado_academico', $request->estado_academico))
            ->when($request->filled('estado_admision'),  fn($q) => $q->where('estado_admision', $request->estado_admision))
            ->when($request->filled('carrera_admitida'), fn($q) => $q->where('carrera_admitida', 'ilike', "%{$request->carrera_admitida}%"))
            ->when($request->filled('primera_carrera'),  fn($q) => $q->where('primera_carrera', 'ilike', "%{$request->primera_carrera}%"))
            ->when($request->filled('segunda_carrera'),  fn($q) => $q->where('segunda_carrera', 'ilike', "%{$request->segunda_carrera}%"))
            ->orderByRaw("CASE WHEN estado_academico = 'aprobado' THEN 0 ELSE 1 END")
            ->orderBy('promedio_final', 'desc')
            ->get();

        return response()->json($resultados->map(fn($r) => $this->formatResultado($r)));
    }

    // ── Procesar admisión ─────────────────────────────────────────────────────

    public function procesar(Request $request): JsonResponse
    {
        $request->validate(['gestion' => 'required|string|max:20']);
        $gestion = trim($request->gestion);

        // Verificar si ya existe un proceso para esta gestión
        $existentes = AdmisionResultado::where('gestion', $gestion)->count();
        if ($existentes > 0 && !$request->boolean('forzar', false)) {
            return response()->json([
                'message'                => "Ya existe un proceso de admisión para la gestión {$gestion} ({$existentes} registros).",
                'existentes'             => $existentes,
                'requiere_confirmacion'  => true,
            ], 409);
        }

        // Limpiar resultados anteriores
        AdmisionResultado::where('gestion', $gestion)->delete();

        // Resolver IDs de materias obligatorias
        $todasMaterias = Materia::all();
        $materiaIds    = $this->resolverMaterias($todasMaterias);

        // Cargar postulantes con cuentas activas y sus exámenes
        $postulantes = Postulante::with(['examenes'])
            ->whereNotNull('user_id')
            ->get();

        if ($postulantes->isEmpty()) {
            return response()->json([
                'message' => 'No hay postulantes con cuenta activa para procesar.',
                'total'   => 0,
            ]);
        }

        // Calcular resultado académico de cada postulante
        $todosResultados = [];
        foreach ($postulantes as $postulante) {
            $todosResultados[] = $this->calcularResultado($postulante, $materiaIds);
        }

        // Separar aprobados (ordenados de mayor a menor promedio) y reprobados
        usort($todosResultados, fn($a, $b) => $b['promedio_final'] <=> $a['promedio_final']);
        $aprobados  = array_filter($todosResultados, fn($r) => $r['estado_academico'] === 'aprobado');
        $reprobados = array_filter($todosResultados, fn($r) => $r['estado_academico'] !== 'aprobado');

        // Inicializar tracker de cupos para esta gestión
        $this->inicializarCupos($gestion);

        // Asignar cupos a aprobados (en orden de promedio)
        $aprobadosConCupo = [];
        foreach (array_values($aprobados) as $r) {
            $aprobadosConCupo[] = $this->asignarCupo($r);
        }

        // Guardar todos los resultados
        $todos = array_merge($aprobadosConCupo, array_values($reprobados));
        foreach ($todos as $r) {
            AdmisionResultado::create(array_merge($r, ['gestion' => $gestion]));
        }

        $collect = collect($todos);
        return response()->json([
            'message' => "Admisión procesada para la gestión {$gestion}.",
            'resumen' => [
                'total'              => $collect->count(),
                'aprobados'          => $collect->where('estado_academico', 'aprobado')->count(),
                'reprobados'         => $collect->whereIn('estado_academico', ['reprobado', 'pendiente'])->count(),
                'admitidos_primera'  => $collect->where('estado_admision', 'admitido_primera')->count(),
                'admitidos_segunda'  => $collect->where('estado_admision', 'admitido_segunda')->count(),
                'aprobados_sin_cupo' => $collect->where('estado_admision', 'aprobado_sin_cupo')->count(),
            ],
        ]);
    }

    // ── Helpers privados ──────────────────────────────────────────────────────

    private function resolverMaterias(Collection $materias): array
    {
        $ids = ['computacion' => null, 'matematicas' => null, 'ingles' => null, 'fisica' => null];

        foreach ($this->materiaKeys as $key => $patrones) {
            $materia = $materias->first(function ($m) use ($patrones) {
                foreach ($patrones as $p) {
                    if (stripos($m->nombre, $p) !== false) return true;
                }
                return false;
            });
            $ids[$key] = $materia?->id;
        }

        return $ids;
    }

    private function calcularResultado(Postulante $postulante, array $materiaIds): array
    {
        $examenes = $postulante->examenes->keyBy('materia_id');

        $promedios = [];
        foreach ($materiaIds as $key => $mid) {
            if ($mid === null) {
                $promedios[$key] = null;
                continue;
            }
            $e = $examenes->get($mid);
            if ($e && $e->nota_1 !== null && $e->nota_2 !== null && $e->nota_3 !== null) {
                $promedios[$key] = round(((float)$e->nota_1 + (float)$e->nota_2 + (float)$e->nota_3) / 3, 2);
            } else {
                $promedios[$key] = null;
            }
        }

        $tieneTodasNotas = !in_array(null, $promedios, true);

        if (!$tieneTodasNotas) {
            $estadoAcademico = 'pendiente';
            $promedioFinal   = null;
            $estadoAdmision  = 'reprobado';
            $motivo          = 'Calificaciones incompletas en una o más materias obligatorias.';
        } elseif (min($promedios) >= 60) {
            $estadoAcademico = 'aprobado';
            $promedioFinal   = round(array_sum($promedios) / 4, 2);
            $estadoAdmision  = 'pendiente'; // se define en asignarCupo
            $motivo          = null;
        } else {
            $reprobadas = array_keys(array_filter($promedios, fn($p) => $p < 60));
            $labels     = ['computacion' => 'Computación', 'matematicas' => 'Matemáticas', 'ingles' => 'Inglés', 'fisica' => 'Física'];
            $nombresRep = implode(', ', array_map(fn($k) => $labels[$k] ?? $k, $reprobadas));

            $estadoAcademico = 'reprobado';
            $promedioFinal   = round(array_sum($promedios) / 4, 2);
            $estadoAdmision  = 'reprobado';
            $motivo          = "Reprobó: {$nombresRep}.";
        }

        return [
            'postulante_id'        => $postulante->id,
            'promedio_computacion' => $promedios['computacion'],
            'promedio_matematicas' => $promedios['matematicas'],
            'promedio_ingles'      => $promedios['ingles'],
            'promedio_fisica'      => $promedios['fisica'],
            'promedio_final'       => $promedioFinal,
            'estado_academico'     => $estadoAcademico,
            'primera_carrera'      => $postulante->carrera_postulada,
            'segunda_carrera'      => ($postulante->carrera && $postulante->carrera !== $postulante->carrera_postulada)
                                        ? $postulante->carrera : null,
            'carrera_admitida'     => null,
            'estado_admision'      => $estadoAdmision,
            'motivo'               => $motivo,
        ];
    }

    private function inicializarCupos(string $gestion): void
    {
        $this->cuposTracker = [];
        $cupos = CupoCarrera::where('gestion', $gestion)->where('estado', 'activo')->get();
        foreach ($cupos as $c) {
            $key = mb_strtolower(trim($c->carrera));
            $this->cuposTracker[$key] = [
                'max'          => $c->cupo_maximo,
                'ocupados'     => 0,
                'key_original' => $c->carrera,
            ];
        }
    }

    private function asignarCupo(array $resultado): array
    {
        if ($resultado['estado_academico'] !== 'aprobado') return $resultado;

        $primera = $resultado['primera_carrera'];
        $segunda = $resultado['segunda_carrera'];

        // Intentar primera opción
        if ($primera) {
            $k = mb_strtolower(trim($primera));
            if (isset($this->cuposTracker[$k]) && $this->cuposTracker[$k]['ocupados'] < $this->cuposTracker[$k]['max']) {
                $this->cuposTracker[$k]['ocupados']++;
                $resultado['carrera_admitida'] = $this->cuposTracker[$k]['key_original'];
                $resultado['estado_admision']  = 'admitido_primera';
                $resultado['motivo']           = 'Admitido en primera opción de carrera.';
                return $resultado;
            }
        }

        // Intentar segunda opción
        if ($segunda) {
            $k = mb_strtolower(trim($segunda));
            if (isset($this->cuposTracker[$k]) && $this->cuposTracker[$k]['ocupados'] < $this->cuposTracker[$k]['max']) {
                $this->cuposTracker[$k]['ocupados']++;
                $resultado['carrera_admitida'] = $this->cuposTracker[$k]['key_original'];
                $resultado['estado_admision']  = 'admitido_segunda';
                $resultado['motivo']           = 'Admitido en segunda opción de carrera (primera opción sin cupo disponible).';
                return $resultado;
            }
        }

        // Sin cupo disponible
        $resultado['carrera_admitida'] = null;
        $resultado['estado_admision']  = 'aprobado_sin_cupo';
        $resultado['motivo']           = 'Sin cupo disponible en primera ni segunda opción de carrera.';
        return $resultado;
    }

    private function formatResultado(AdmisionResultado $r): array
    {
        $p = $r->postulante;
        return [
            'id'                   => $r->id,
            'postulante_id'        => $r->postulante_id,
            'nombre'               => $p ? "{$p->nombres} {$p->apellidos}" : '—',
            'ci'                   => $p?->ci ?? '—',
            'registro'             => $p?->codigo_usuario ?? '—',
            'primera_carrera'      => $r->primera_carrera,
            'segunda_carrera'      => $r->segunda_carrera,
            'promedio_computacion' => $r->promedio_computacion,
            'promedio_matematicas' => $r->promedio_matematicas,
            'promedio_ingles'      => $r->promedio_ingles,
            'promedio_fisica'      => $r->promedio_fisica,
            'promedio_final'       => $r->promedio_final,
            'estado_academico'     => $r->estado_academico,
            'carrera_admitida'     => $r->carrera_admitida,
            'estado_admision'      => $r->estado_admision,
            'motivo'               => $r->motivo,
        ];
    }
}
