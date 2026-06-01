<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Grupo extends Model
{
    protected $fillable = [
        'nombre_grupo', 'capacidad_maxima', 'docente_id',
        'materia_id', 'aula', 'horario', 'estado',
        'codigo', 'turno', 'dias', 'cupo_maximo',
    ];

    protected function casts(): array
    {
        return [
            'dias' => 'array',
        ];
    }

    // ── Relaciones antiguas (compatibilidad) ──
    public function docente(): BelongsTo
    {
        return $this->belongsTo(Docente::class, 'docente_id');
    }

    public function materia(): BelongsTo
    {
        return $this->belongsTo(Materia::class, 'materia_id');
    }

    public function postulantes(): BelongsToMany
    {
        return $this->belongsToMany(Postulante::class, 'grupo_postulante')
                    ->withTimestamps();
    }

    // ── Nuevas relaciones del coordinador ──
    public function horarios(): HasMany
    {
        return $this->hasMany(GrupoHorario::class);
    }

    public function asignaciones(): HasMany
    {
        return $this->hasMany(DocenteGrupoAsignacion::class);
    }

    // ── Helpers ──
    public function ocupacion(): int
    {
        return $this->postulantes()->count();
    }

    public function estaLleno(): bool
    {
        $cupo = $this->cupo_maximo ?? $this->capacidad_maxima ?? 40;
        return $this->ocupacion() >= $cupo;
    }
}
