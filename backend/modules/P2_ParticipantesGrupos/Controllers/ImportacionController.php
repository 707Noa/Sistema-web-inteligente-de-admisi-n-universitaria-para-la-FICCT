<?php

namespace Modules\P2_ParticipantesGrupos\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Postulante;
use Modules\P1_SeguridadAdministracion\Services\CuentaPostulanteService;
use Modules\P4_ReportesMonitoreoAuditoria\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ImportacionController extends Controller
{
    protected CuentaPostulanteService $cuentaService;

    public function __construct(CuentaPostulanteService $cuentaService)
    {
        $this->cuentaService = $cuentaService;
    }

    /**
     * Importar postulantes desde CSV.
     *
     * Formato (separador ;):
     * Nombres;Apellidos;CI;Correo;Teléfono;"1ª Carrera";"2ª Carrera";"Unidad Educativa";Ciudad;Estado
     *
     * Estado:
     *   PREINSCRITO → solo importa el postulante (sin cuenta de acceso)
     *   INSCRITO    → importa el postulante Y genera cuenta de acceso automáticamente
     */
    public function importarPostulantesCsv(Request $request): JsonResponse
    {
        $request->validate([
            'archivo' => 'required|file|mimes:csv,txt',
        ]);

        $handle = fopen($request->file('archivo')->getRealPath(), 'r');
        if (!$handle) {
            return response()->json(['message' => 'No se pudo abrir el archivo.'], 400);
        }

        // Auto-detectar delimitador
        $firstLine = fgets($handle);
        $delimiter = substr_count($firstLine ?? '', ',') > substr_count($firstLine ?? '', ';') ? ',' : ';';
        rewind($handle);

        $rawHeaders = fgetcsv($handle, 0, $delimiter);
        if (!$rawHeaders) {
            fclose($handle);
            return response()->json(['message' => 'El archivo está vacío o no es CSV válido.'], 400);
        }

        if (!empty($rawHeaders[0]) && str_starts_with($rawHeaders[0], "\xEF\xBB\xBF")) {
            $rawHeaders[0] = substr($rawHeaders[0], 3);
        }

        $aliases = [
            'nombres'          => ['nombres', 'nombre'],
            'apellidos'        => ['apellidos', 'apellido'],
            'ci'               => ['ci', 'carnet', 'cédula', 'cedula', 'c.i.'],
            'correo'           => ['correo', 'email', 'correo electronico', 'correo electrónico'],
            'telefono'         => ['teléfono', 'telefono', 'celular', 'tel'],
            'primera_carrera'  => ['1ª carrera', '1a carrera', 'primera carrera', 'carrera', '1° carrera'],
            'segunda_carrera'  => ['2ª carrera', '2a carrera', 'segunda carrera', '2° carrera'],
            'unidad_educativa' => ['unidad educativa', 'colegio', 'colegio_procedencia', 'unidad_educativa'],
            'ciudad'           => ['ciudad'],
            'estado'           => ['estado'],
            'requisitos'       => ['requisitos', 'requisito', 'requisitos_completos', 'documentos_completos', 'verificado', 'estado_documentos', 'documentos_verificados'],
        ];

        $colMap = [];
        foreach ($rawHeaders as $i => $h) {
            $norm = mb_strtolower(trim($h, " \t\n\r\0\x0B\"'"));
            foreach ($aliases as $key => $list) {
                if (in_array($norm, $list, true)) {
                    $colMap[$key] = $i;
                    break;
                }
            }
        }

        if (!isset($colMap['nombres'], $colMap['apellidos'], $colMap['ci'])) {
            fclose($handle);
            return response()->json([
                'message' => 'El CSV debe contener las columnas: Nombres, Apellidos y CI como mínimo.',
            ], 400);
        }

        $total = $importados = $inscritos = $omitidos = 0;
        $errores = [];

        while (($row = fgetcsv($handle, 0, $delimiter)) !== false) {
            if (empty(array_filter($row, fn($v) => $v !== ''))) continue;

            $total++;
            $fila = $total + 1;
            $get  = fn(string $k) => isset($colMap[$k], $row[$colMap[$k]]) ? trim($row[$colMap[$k]]) : '';

            $nombres   = $get('nombres');
            $apellidos = $get('apellidos');
            $ci        = $get('ci');

            if (empty($ci)) {
                $omitidos++;
                $errores[] = "Fila {$fila}: CI vacío — omitida.";
                continue;
            }
            if (empty($nombres) || empty($apellidos)) {
                $omitidos++;
                $errores[] = "CI {$ci}: nombres o apellidos vacíos — omitida.";
                continue;
            }
            if (Postulante::where('ci', $ci)->exists()) {
                $omitidos++;
                $errores[] = "CI {$ci}: ya existe en el sistema — omitida.";
                continue;
            }

            $estadoCsv     = strtoupper($get('estado'));
            $estadoTramite = in_array($estadoCsv, ['INSCRITO', 'PREINSCRITO']) ? $estadoCsv : 'PREINSCRITO';
            $segundaCarrera = $get('segunda_carrera');

            $requisitosRaw = $get('requisitos');
            $requisitosCompletos = false;
            if ($requisitosRaw !== '') {
                $normReq = mb_strtolower(trim($requisitosRaw));
                if (in_array($normReq, ['sí', 'si', 'sì', 'true', '1', 'cumple', 'completo', 'completado'])) {
                    $requisitosCompletos = true;
                }
            }

            try {
                $postulante = Postulante::create([
                    'nombres'             => $nombres,
                    'apellidos'           => $apellidos,
                    'ci'                  => $ci,
                    'email'               => ($get('correo') ?: null),
                    'celular'             => ($get('telefono') ?: null),
                    'carrera'             => ($get('primera_carrera') ?: null),
                    'carrera_postulada'   => ($get('primera_carrera') ?: null),
                    'colegio_procedencia' => ($get('unidad_educativa') ?: null),
                    'ciudad'              => ($get('ciudad') ?: null),
                    'otros'               => $segundaCarrera !== '' ? "2ª Carrera: {$segundaCarrera}" : null,
                    'estado_tramite'      => $estadoTramite,
                    'estado'              => 'pendiente',
                    'pago_estado'         => 'PAGADO',
                    'pago_metodo'         => 'CSV',
                    'pago_fecha'          => now(),
                    'requisitos_completos'=> $requisitosCompletos,
                ]);

                $importados++;

                // Si el estado es INSCRITO, crear cuenta de acceso automáticamente
                if ($estadoTramite === 'INSCRITO') {
                    try {
                        $this->cuentaService->crearCuenta($postulante);
                        $inscritos++;
                    } catch (\Exception $e) {
                        $errores[] = "CI {$ci} (cuenta): " . $e->getMessage();
                    }
                }
            } catch (\Exception $e) {
                $errores[] = "CI {$ci}: " . $e->getMessage();
            }
        }

        fclose($handle);

        AuditoriaService::registrar(
            $request->user()->id,
            'Importó postulantes desde CSV',
            'Postulantes',
            $request,
            "Filas: {$total}, Importados: {$importados}, Cuentas creadas: {$inscritos}, Omitidos: {$omitidos}"
        );

        return response()->json([
            'message'   => "Completado. Importados: {$importados} | Cuentas creadas: {$inscritos} | Omitidos: {$omitidos}.",
            'total'     => $total,
            'importados'=> $importados,
            'inscritos' => $inscritos,
            'omitidos'  => $omitidos,
            'errores'   => $errores,
        ]);
    }
}
