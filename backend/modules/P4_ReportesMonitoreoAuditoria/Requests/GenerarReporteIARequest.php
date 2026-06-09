<?php

namespace Modules\P4_ReportesMonitoreoAuditoria\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\P4_ReportesMonitoreoAuditoria\Services\ReporteCatalogoService;

class GenerarReporteIARequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tiposPermitidos = implode(',', array_keys(ReporteCatalogoService::catalogo()));

        return [
            'tipo_reporte' => ['required', 'string', "in:{$tiposPermitidos}"],
            'formato'      => ['required', 'string', 'in:pdf,excel'],
            'filtros'      => ['nullable', 'array'],
            'filtros.grupo'   => ['nullable', 'string', 'max:20'],
            'filtros.turno'   => ['nullable', 'string', 'in:mañana,tarde,noche'],
            'filtros.materia' => ['nullable', 'string', 'max:100'],
            'filtros.carrera' => ['nullable', 'string', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'tipo_reporte.required' => 'El tipo de reporte es requerido.',
            'tipo_reporte.in' => 'Este tipo de reporte no está disponible.',
            'formato.required' => 'El formato de exportación es requerido.',
            'formato.in' => 'El formato debe ser pdf o excel.',
        ];
    }
}
