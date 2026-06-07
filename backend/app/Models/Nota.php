<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Nota extends Model
{
    protected $table = 'notas';

    protected $fillable = [
        'postulante_id', 'grupo_id', 'materia_id', 'docente_id',
        'nota_1', 'nota_2', 'nota_3', 'promedio',
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

    public function grupo(): BelongsTo
    {
        return $this->belongsTo(Grupo::class, 'grupo_id');
    }

    public function materia(): BelongsTo
    {
        return $this->belongsTo(Materia::class, 'materia_id');
    }

    public function docente(): BelongsTo
    {
        return $this->belongsTo(User::class, 'docente_id');
    }

    protected static function booted()
    {
        static::saving(function ($nota) {
            $nota_1 = $nota->nota_1 !== null ? (float)$nota->nota_1 : null;
            $nota_2 = $nota->nota_2 !== null ? (float)$nota->nota_2 : null;
            $nota_3 = $nota->nota_3 !== null ? (float)$nota->nota_3 : null;

            if ($nota_1 !== null && $nota_2 !== null && $nota_3 !== null) {
                $nota->promedio = round(($nota_1 + $nota_2 + $nota_3) / 3, 2);
            } else {
                $nota->promedio = null;
            }
        });
    }
}
