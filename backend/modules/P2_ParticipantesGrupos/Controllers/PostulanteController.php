<?php

namespace Modules\P2_ParticipantesGrupos\Controllers;

use App\Http\Controllers\Controller;
use App\Models\DocenteGrupoAsignacion;
use App\Models\Postulante;
use Modules\P4_ReportesMonitoreoAuditoria\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PostulanteController extends Controller
{
    /**
     * Genera el código de registro: "2026" + CI al revés.
     */
    private function generarRegistro(string $ci): string
    {
        return '2026' . strrev(trim($ci));
    }

    /**
     * Aplica el filtro de búsqueda a un query builder.
     */
    private function applySearch($query, ?string $search)
    {
        if (!$search) return $query;
        return $query->where(function ($q) use ($search) {
            $q->where('nombres', 'ilike', "%{$search}%")
              ->orWhere('apellidos', 'ilike', "%{$search}%")
              ->orWhere('ci', 'ilike', "%{$search}%")
              ->orWhere('email', 'ilike', "%{$search}%")
              ->orWhere('carrera', 'ilike', "%{$search}%")
              ->orWhere('carrera_postulada', 'ilike', "%{$search}%");
        });
    }

    /**
     * Normaliza strings vacíos a null para campos nullable.
     */
    private function nullifyEmpty(array $data, array $fields): array
    {
        foreach ($fields as $field) {
            if (isset($data[$field]) && $data[$field] === '') {
                $data[$field] = null;
            }
        }
        return $data;
    }

    public function index(Request $request): JsonResponse
    {
<<<<<<< Updated upstream
        $search         = $request->input('search');
        $filtroEstado   = $request->input('estado_tramite');
        $filtroCarrera  = $request->input('carrera');
=======
        $query = Postulante::with(['user', 'grupos', 'examenes.materia'])
            ->whereIn('estado_tramite', ['PREINSCRITO', 'INSCRITO']);
>>>>>>> Stashed changes

        // ── Conteos para filtros ──────────────────────────────────────────────
        // Estado: cuenta con search + carrera (sin filtro de estado)
        $qEstado = $this->applySearch(Postulante::query(), $search);
        if ($filtroCarrera) {
            $qEstado->where(function ($q) use ($filtroCarrera) {
                $q->where('carrera', $filtroCarrera)
                  ->orWhere('carrera_postulada', $filtroCarrera);
            });
        }
        $conteoEstado = $qEstado
            ->whereNotNull('estado_tramite')
            ->groupBy('estado_tramite')
            ->selectRaw('estado_tramite, count(*) as total')
            ->pluck('total', 'estado_tramite');

<<<<<<< Updated upstream
        // Carrera: cuenta con search + estado (sin filtro de carrera)
        $qCarrera = $this->applySearch(Postulante::query(), $search);
        if ($filtroEstado) {
            $qCarrera->where('estado_tramite', $filtroEstado);
        }
        $conteoCarrera = $qCarrera
            ->selectRaw("COALESCE(NULLIF(carrera,''), carrera_postulada) as nombre_carrera, count(*) as total")
            ->whereRaw("COALESCE(NULLIF(carrera,''), carrera_postulada) IS NOT NULL")
            ->groupByRaw("COALESCE(NULLIF(carrera,''), carrera_postulada)")
            ->pluck('total', 'nombre_carrera');

        // ── Query principal ───────────────────────────────────────────────────
        $query = $this->applySearch(Postulante::with(['user']), $search);

        if ($filtroEstado) {
            $query->where('estado_tramite', $filtroEstado);
        }
        if ($filtroCarrera) {
            $query->where(function ($q) use ($filtroCarrera) {
                $q->where('carrera', $filtroCarrera)
                  ->orWhere('carrera_postulada', $filtroCarrera);
=======
        if ($request->filled('carrera')) {
            $c = $request->carrera;
            $query->where(function ($q) use ($c) {
                $q->where('carrera', 'ilike', "%{$c}%")
                  ->orWhere('carrera_postulada', 'ilike', "%{$c}%");
>>>>>>> Stashed changes
            });
        }

        $estado = $request->input('estado') ?? $request->input('estado_tramite');
        if (!empty($estado) && strtolower($estado) !== 'todos') {
            $query->where('estado_tramite', $estado);
        }

        $ordenNombre = $request->input('orden_nombre');
        if ($ordenNombre === 'asc') {
            $query->orderBy('apellidos', 'asc')->orderBy('nombres', 'asc');
        } elseif ($ordenNombre === 'desc') {
            $query->orderBy('apellidos', 'desc')->orderBy('nombres', 'desc');
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $perPage = $request->integer('per_page', 15);
        if ($perPage < 1 || $perPage > 100) {
            $perPage = 15;
        }

        $postulantes = $query->paginate($perPage);

        // Map requirements check for each item
        $postulantes->getCollection()->transform(function ($p) {
            $hasCi = !empty($p->imagen_ci_path);
            $hasTitulo = !empty($p->imagen_titulo_bachiller_path);
            $hasFoto = !empty($p->fotografia_path) || !empty($p->foto);
            $p->requisitos_cumplidos = (bool) $p->requisitos_completos;
            $p->documentos = [
                'ci' => $hasCi,
                'titulo' => $hasTitulo,
                'fotografia' => $hasFoto,
            ];
            return $p;
        });

        $result = $postulantes->toArray();
        $result['conteos'] = [
            'estado_tramite' => $conteoEstado,
            'carrera'        => $conteoCarrera,
        ];

        return response()->json($result);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'nombres'             => 'required|string|max:191',
            'apellidos'           => 'required|string|max:191',
            'ci'                  => 'required|string|max:20|unique:postulantes,ci',
            'email'               => 'nullable|email|max:191|unique:postulantes,email',
            'celular'             => 'nullable|string|max:20|unique:postulantes,celular',
            'genero'              => 'nullable|in:masculino,femenino,otro',
            'fecha_nacimiento'    => 'nullable|date',
            'carrera'             => 'nullable|string|max:191',
            'carrera_postulada'   => 'nullable|string|max:191',
            'colegio_procedencia' => 'nullable|string|max:191',
            'ciudad'              => 'nullable|string|max:100',
            'estado_tramite'      => 'nullable|in:PENDIENTE_PAGO,PREINSCRITO,INSCRITO',
            'direccion'           => 'nullable|string|max:500',
        ], [
            'ci.unique'      => 'El CI ya está registrado.',
            'email.unique'   => 'El correo electrónico ya está registrado.',
            'celular.unique' => 'El teléfono ya está registrado.',
        ]);

        $data = $request->only([
            'nombres', 'apellidos', 'ci', 'email', 'celular', 'genero',
            'fecha_nacimiento', 'carrera', 'carrera_postulada',
            'colegio_procedencia', 'ciudad', 'estado_tramite', 'direccion',
        ]);

        $data = $this->nullifyEmpty($data, ['email', 'celular', 'fecha_nacimiento', 'carrera', 'carrera_postulada', 'colegio_procedencia', 'ciudad', 'direccion']);

        // Generar registro automáticamente
        $data['codigo_usuario'] = $this->generarRegistro($data['ci']);
        $data['estado_tramite'] = $data['estado_tramite'] ?? 'PREINSCRITO';
        $data['estado']         = 'pendiente';
        $data['pago_estado']    = 'PAGADO';

        // Sincronizar carrera_postulada
        if (empty($data['carrera_postulada']) && !empty($data['carrera'])) {
            $data['carrera_postulada'] = $data['carrera'];
        }

        $postulante = Postulante::create($data);

        AuditoriaService::registrar(
            $request->user()->id,
            'Registró un postulante',
            'Postulantes',
            $request,
            "Postulante: {$postulante->nombres} {$postulante->apellidos} | Registro: {$postulante->codigo_usuario}"
        );

        return response()->json($postulante, 201);
    }

    public function show(int $id): JsonResponse
    {
        $postulante = Postulante::with(['user', 'grupos.docente', 'grupos.materia', 'examenes.materia'])->findOrFail($id);
        $postulante->requisitos_cumplidos = (bool) $postulante->requisitos_completos;
        return response()->json($postulante);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $postulante = Postulante::findOrFail($id);

        $request->validate([
<<<<<<< Updated upstream
            'nombres'             => 'required|string|max:191',
            'apellidos'           => 'required|string|max:191',
            'ci'                  => "required|string|max:20|unique:postulantes,ci,{$id}",
            'email'               => "nullable|email|max:191|unique:postulantes,email,{$id}",
            'celular'             => "nullable|string|max:20|unique:postulantes,celular,{$id}",
            'genero'              => 'nullable|in:masculino,femenino,otro',
            'fecha_nacimiento'    => 'nullable|date',
            'carrera'             => 'nullable|string|max:191',
            'carrera_postulada'   => 'nullable|string|max:191',
            'colegio_procedencia' => 'nullable|string|max:191',
            'ciudad'              => 'nullable|string|max:100',
            'estado_tramite'      => 'nullable|in:PENDIENTE_PAGO,PREINSCRITO,INSCRITO',
            'direccion'           => 'nullable|string|max:500',
        ], [
            'ci.unique'      => 'El CI ya está registrado.',
            'email.unique'   => 'El correo electrónico ya está registrado.',
            'celular.unique' => 'El teléfono ya está registrado.',
        ]);

        $data = $request->only([
            'nombres', 'apellidos', 'ci', 'email', 'celular', 'genero',
            'fecha_nacimiento', 'carrera', 'carrera_postulada',
            'colegio_procedencia', 'ciudad', 'estado_tramite', 'direccion',
        ]);

        $data = $this->nullifyEmpty($data, ['email', 'celular', 'fecha_nacimiento', 'carrera', 'carrera_postulada', 'colegio_procedencia', 'ciudad', 'direccion']);

        // Recalcular registro si el CI cambió
        if (!empty($data['ci']) && $data['ci'] !== $postulante->ci) {
            $data['codigo_usuario'] = $this->generarRegistro($data['ci']);
        }

        // Sincronizar carrera_postulada
        if (empty($data['carrera_postulada']) && !empty($data['carrera'])) {
            $data['carrera_postulada'] = $data['carrera'];
=======
            'nombres' => 'required|string|max:191',
            'apellidos' => 'required|string|max:191',
            'ci' => "required|string|unique:postulantes,ci,{$id}",
            'requisitos_completos' => 'nullable|boolean',
        ]);

        $data = $request->all();
        if (!$request->user() || !$request->user()->hasRole('coordinador')) {
            unset($data['requisitos_completos']);
>>>>>>> Stashed changes
        }

        $postulante->update($data);

        AuditoriaService::registrar(
            $request->user()->id,
            'Editó un postulante',
            'Postulantes',
            $request,
            "Postulante: {$postulante->nombres} {$postulante->apellidos} | Registro: {$postulante->codigo_usuario}"
        );

        return response()->json($postulante);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $postulante = Postulante::findOrFail($id);
        $name = "{$postulante->nombres} {$postulante->apellidos}";

        $isAdmin = $request->user() && $request->user()->hasRole('administrador');
        if (!$isAdmin) {
            $status = strtolower($postulante->estado_tramite ?? $postulante->estado ?? '');
            if ($status !== 'inactivo') {
                return response()->json([
                    'message' => 'Solo se pueden eliminar postulantes con estado INACTIVO.'
                ], 400);
            }
        }

        if ($postulante->user_id) {
            $user = $postulante->user;
            if ($user) {
                $user->estado = 'inactivo';
                $user->save();
            }
        }

        $postulante->delete();

        AuditoriaService::registrar(
            $request->user()->id,
            'Eliminó un postulante',
            'Postulantes',
            $request,
            "Postulante: {$name}"
        );

        return response()->json(['message' => 'Postulante eliminado correctamente.']);
    }

    public function perfil(Request $request): JsonResponse
    {
        $user = $request->user();
        $postulante = Postulante::with(['grupos.docente', 'grupos.materia', 'examenes.materia'])
            ->where('user_id', $user->id)
            ->firstOrFail();

        return response()->json($postulante);
    }

    // ── Mi Horario (para el postulante autenticado) ──────────────────────────

    public function horarioPostulante(Request $request): JsonResponse
    {
        $user       = $request->user();
        $postulante = Postulante::where('user_id', $user->id)
            ->with(['grupos'])
            ->firstOrFail();

        if ($postulante->grupos->isEmpty()) {
            return response()->json([
                'grupo'           => null,
                'horario_semanal' => [],
                'docentes'        => [],
            ]);
        }

        $grupo = $postulante->grupos->first();

        $asignaciones = DocenteGrupoAsignacion::with(['materia', 'docente'])
            ->where('grupo_id', $grupo->id)
            ->where('estado', 'activo')
            ->orderBy('hora_inicio')
            ->get();

        $slots       = [];
        $docentesMap = [];

        foreach ($asignaciones as $a) {
            $inicio = substr($a->hora_inicio, 0, 5);
            $fin    = substr($a->hora_fin, 0, 5);
            $key    = $inicio . '|' . $fin;

            if (!isset($slots[$key])) {
                $slots[$key] = [
                    'hora_inicio' => $inicio,
                    'hora_fin'    => $fin,
                    'lunes'       => null,
                    'martes'      => null,
                    'miercoles'   => null,
                    'jueves'      => null,
                    'viernes'     => null,
                    'sabado'      => null,
                ];
            }

            $slots[$key][$a->dia] = [
                'materia' => $a->materia?->nombre,
                'aula'    => $grupo->aula,
            ];

            $matNombre = $a->materia?->nombre;
            if ($matNombre && !isset($docentesMap[$matNombre])) {
                $docentesMap[$matNombre] = $a->docente?->name ?? 'Por asignar';
            }
        }

        ksort($slots);

        return response()->json([
            'grupo' => [
                'id'         => $grupo->id,
                'codigo'     => $grupo->codigo,
                'turno'      => $grupo->turno,
                'aula'       => $grupo->aula,
                'cupo_maximo'=> $grupo->cupo_maximo,
            ],
            'horario_semanal' => array_values($slots),
            'docentes'        => $docentesMap,
        ]);
    }

    public function uploadFoto(Request $request, int $id): JsonResponse
    {
        $request->validate(['foto' => 'required|image|max:2048']);
        $postulante = Postulante::findOrFail($id);

        $path = $request->file('foto')->store('fotos/postulantes', 'public');
        $postulante->update(['foto' => $path]);

        return response()->json(['foto' => $path]);
    }

    /**
     * Crear cuentas masivamente para seleccionados, filtrados o todos los elegibles.
     */
    public function crearCuentasMasivo(Request $request): JsonResponse
    {
        $postulanteIds = $request->input('postulante_ids', []);
        $filtros = $request->input('filtros');

        $query = Postulante::query();

        // Prioridad 1: Selección manual
        if (!empty($postulanteIds)) {
            $query->whereIn('id', $postulanteIds);
        }
        // Prioridad 2: Filtros activos
        elseif (is_array($filtros) && !empty($filtros)) {
            if (!empty($filtros['search'])) {
                $s = $filtros['search'];
                $query->where(function ($q) use ($s) {
                    $q->where('nombres', 'ilike', "%{$s}%")
                      ->orWhere('apellidos', 'ilike', "%{$s}%")
                      ->orWhere('ci', 'ilike', "%{$s}%")
                      ->orWhere('email', 'ilike', "%{$s}%")
                      ->orWhere('carrera_postulada', 'ilike', "%{$s}%")
                      ->orWhere('carrera', 'ilike', "%{$s}%");
                });
            }
            if (!empty($filtros['carrera'])) {
                $c = $filtros['carrera'];
                $query->where(function ($q) use ($c) {
                    $q->where('carrera', 'ilike', "%{$c}%")
                      ->orWhere('carrera_postulada', 'ilike', "%{$c}%");
                });
            }
            $estado = $filtros['estado'] ?? $filtros['estado_tramite'] ?? null;
            if (!empty($estado) && strtolower($estado) !== 'todos') {
                $query->where('estado_tramite', $estado);
            }
        }
        // Prioridad 3: General (Todos los elegibles sin cuenta y preinscritos)
        else {
            $query->where('estado_tramite', 'PREINSCRITO')->whereNull('user_id');
        }

        $postulantes = $query->get();

        $totalProcesados = count($postulantes);
        $cuentasCreadas = 0;
        $omitidos = 0;
        $errores = [];

        $cuentaService = resolve(\Modules\P1_SeguridadAdministracion\Services\CuentaPostulanteService::class);

        foreach ($postulantes as $p) {
            try {
                if (!$p->requisitos_completos) {
                    throw new \Exception('Faltan documentos obligatorios.');
                }
                $cuentaService->crearCuenta($p);
                $cuentasCreadas++;
            } catch (\Exception $e) {
                $omitidos++;
                $errores[] = [
                    'postulante_id' => $p->id,
                    'nombre' => trim($p->nombres . ' ' . $p->apellidos),
                    'error' => $e->getMessage()
                ];
            }
        }

        return response()->json([
            'message' => 'Proceso finalizado.',
            'total_procesados' => $totalProcesados,
            'cuentas_creadas' => $cuentasCreadas,
            'omitidos' => $omitidos,
            'errores' => $errores
        ]);
    }

    /**
     * Eliminación masiva de postulantes.
     */
    public function eliminarMasivo(Request $request): JsonResponse
    {
        return $this->eliminarMultiple($request);
    }

    public function exportarCsv(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $query = Postulante::with(['grupos']);

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('nombres', 'ilike', "%{$s}%")
                  ->orWhere('apellidos', 'ilike', "%{$s}%")
                  ->orWhere('ci', 'ilike', "%{$s}%")
                  ->orWhere('email', 'ilike', "%{$s}%")
                  ->orWhere('carrera_postulada', 'ilike', "%{$s}%")
                  ->orWhere('carrera', 'ilike', "%{$s}%");
            });
        }

        if ($request->filled('carrera')) {
            $c = $request->carrera;
            $query->where(function ($q) use ($c) {
                $q->where('carrera', 'ilike', "%{$c}%")
                  ->orWhere('carrera_postulada', 'ilike', "%{$c}%");
            });
        }

        $estado = $request->input('estado') ?? $request->input('estado_tramite');
        if (!empty($estado) && strtolower($estado) !== 'todos') {
            $query->where('estado_tramite', $estado);
        }

        $postulantes = $query->orderBy('apellidos', 'asc')->orderBy('nombres', 'asc')->get();

        $headers = [
            'Content-type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename=postulantes_cup.csv',
            'Pragma'              => 'no-cache',
            'Cache-Control'       => 'must-revalidate, post-check=0, pre-check=0',
            'Expires'             => '0',
        ];

        $callback = function () use ($postulantes) {
            $file = fopen('php://output', 'w');
            fprintf($file, chr(0xEF) . chr(0xBB) . chr(0xBF)); // BOM UTF-8

            fputcsv($file, ['ID', 'Nombre Completo', 'CI', 'Correo', 'Teléfono', 'Carrera', 'Estado', 'Grupo Asignado', 'Requisitos Completos', 'Fecha de Inscripción'], ';');

            foreach ($postulantes as $p) {
                fputcsv($file, [
                    $p->id,
                    $p->nombres . ' ' . $p->apellidos,
                    $p->ci,
                    $p->email ?? '-',
                    $p->celular ?? '-',
                    $p->carrera_postulada ?? $p->carrera ?? '-',
                    $p->estado_tramite ?? '-',
                    $p->grupos->pluck('codigo')->implode(', ') ?: 'Sin asignar',
                    $p->requisitos_completos ? 'Sí' : 'No',
                    $p->created_at ? $p->created_at->format('Y-m-d H:i:s') : '-',
                ], ';');
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function updateRequisitos(Request $request, int $id): JsonResponse
    {
        if (!$request->user() || !$request->user()->hasRole('coordinador')) {
            return response()->json(['message' => 'No tienes permiso para modificar los requisitos.'], 403);
        }

        $request->validate([
            'requisitos_completos' => 'required|boolean'
        ]);

        $postulante = Postulante::findOrFail($id);
        $postulante->requisitos_completos = (bool) $request->input('requisitos_completos');
        $postulante->save();

        AuditoriaService::registrar(
            $request->user()->id,
            $postulante->requisitos_completos ? 'Marcó requisitos como COMPLETOS' : 'Marcó requisitos como INCOMPLETOS',
            'Postulantes',
            $request,
            "Postulante: {$postulante->nombres} {$postulante->apellidos}"
        );

        $postulante->requisitos_cumplidos = $postulante->requisitos_completos;

        return response()->json($postulante);
    }

    public function eliminarMultiple(Request $request): JsonResponse
    {
        $ids = $request->input('ids') ?? $request->input('postulante_ids') ?? [];

        if (empty($ids)) {
            return response()->json(['message' => 'Seleccione al menos un postulante.'], 400);
        }

        $postulantes = Postulante::whereIn('id', $ids)->get();

        $isAdmin = $request->user() && $request->user()->hasRole('administrador');
        if (!$isAdmin) {
            // Validate that all are INACTIVO
            foreach ($postulantes as $p) {
                $status = strtolower($p->estado_tramite ?? $p->estado ?? '');
                if ($status !== 'inactivo') {
                    return response()->json([
                        'message' => 'Todos los postulantes seleccionados deben tener estado INACTIVO.'
                    ], 400);
                }
            }
        }

        $eliminados = 0;
        foreach ($postulantes as $p) {
            if ($p->user_id) {
                $user = $p->user;
                if ($user) {
                    $user->estado = 'inactivo';
                    $user->save();
                }
            }
            $p->delete();
            $eliminados++;
        }

        AuditoriaService::registrar(
            $request->user()->id,
            'Eliminó múltiples postulantes',
            'Postulantes',
            $request,
            "Total eliminados: {$eliminados}"
        );

        return response()->json([
            'message' => "Proceso de eliminación finalizado. Se eliminaron {$eliminados} registros."
        ]);
    }
}
