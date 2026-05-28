<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Examen extends Model
{
    protected $table = 'examenes';

    protected $fillable = [
        'postulante_id', 'materia_id', 'nota_1', 'nota_2', 'nota_3',
        'promedio', 'estado', 'carrera_adjudicada',
    ];

    protected function casts(): array
    {
        return [
            'nota_1' => 'decimal:2',
            'nota_2' => 'decimal:2',
            'nota_3' => 'decimal:2',
            'promedio' => 'decimal:2',
        ];
    }

    public function postulante(): BelongsTo
    {
        return $this->belongsTo(Postulante::class, 'postulante_id');
    }

    public function materia(): BelongsTo
    {
        return $this->belongsTo(Materia::class, 'materia_id');
    }

    public function calcularPromedio(): void
    {
        if ($this->nota_1 !== null && $this->nota_2 !== null && $this->nota_3 !== null) {
            $this->promedio = round(($this->nota_1 + $this->nota_2 + $this->nota_3) / 3, 2);
            $this->estado = $this->promedio >= 51 ? 'aprobado' : 'reprobado';
        } else {
            $this->promedio = null;
            $this->estado = 'pendiente';
        }
    }
}
