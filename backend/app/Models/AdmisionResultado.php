<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdmisionResultado extends Model
{
    protected $table = 'admision_resultados';

    protected $fillable = [
        'postulante_id', 'gestion',
        'promedio_computacion', 'promedio_matematicas', 'promedio_ingles', 'promedio_fisica',
        'promedio_final', 'estado_academico',
        'primera_carrera', 'segunda_carrera', 'carrera_admitida',
        'estado_admision', 'motivo',
    ];

    protected function casts(): array
    {
        return [
            'promedio_computacion' => 'decimal:2',
            'promedio_matematicas' => 'decimal:2',
            'promedio_ingles'      => 'decimal:2',
            'promedio_fisica'      => 'decimal:2',
            'promedio_final'       => 'decimal:2',
        ];
    }

    public function postulante(): BelongsTo
    {
        return $this->belongsTo(Postulante::class, 'postulante_id');
    }
}
