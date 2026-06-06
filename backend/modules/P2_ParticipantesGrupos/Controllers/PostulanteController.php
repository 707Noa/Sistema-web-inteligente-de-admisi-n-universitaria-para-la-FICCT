<?php

namespace Modules\P2_ParticipantesGrupos\Controllers;

use App\Http\Controllers\Controller;
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
        $search         = $request->input('search');
        $filtroEstado   = $request->input('estado_tramite');
        $filtroCarrera  = $request->input('carrera');

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
            });
        }

        $postulantes = $query->orderBy('created_at', 'desc')->paginate(15);

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
        return response()->json($postulante);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $postulante = Postulante::findOrFail($id);

        $request->validate([
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
        $postulante->delete();

        AuditoriaService::registrar(
            $request->user()->id,
            'Eliminó un postulante',
            'Postulantes',
            $request,
            "Postulante: {$name}"
        );

        return response()->json(['message' => 'Postulante eliminado.']);
    }

    public function perfil(Request $request): JsonResponse
    {
        $user = $request->user();
        $postulante = Postulante::with(['grupos.docente', 'grupos.materia', 'examenes.materia'])
            ->where('user_id', $user->id)
            ->firstOrFail();

        return response()->json($postulante);
    }

    public function uploadFoto(Request $request, int $id): JsonResponse
    {
        $request->validate(['foto' => 'required|image|max:2048']);
        $postulante = Postulante::findOrFail($id);

        $path = $request->file('foto')->store('fotos/postulantes', 'public');
        $postulante->update(['foto' => $path]);

        return response()->json(['foto' => $path]);
    }
}
