<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Preinscripcion extends Model
{
    protected $table = 'preinscripciones';

    protected $fillable = [
        'numero_formulario', 'nombres', 'apellidos', 'ci', 'genero',
        'fecha_nacimiento', 'celular', 'segundo_celular', 'email', 'direccion',
        'unidad_educativa', 'tipo_colegio', 'turno', 'provincia', 'anio_egreso',
        'codigo_qr', 'declaracion_jurada', 'estado',
    ];

    protected function casts(): array
    {
        return [
            'fecha_nacimiento' => 'date',
            'declaracion_jurada' => 'boolean',
        ];
    }

    public function carreras(): BelongsToMany
    {
        return $this->belongsToMany(Carrera::class, 'preinscripcion_carreras')
                    ->withPivot('opcion')
                    ->withTimestamps();
    }

    public static function generarNumeroFormulario(): string
    {
        $year = date('Y');
        $last = self::whereYear('created_at', $year)->max('id') ?? 0;
        $next = $last + 1;
        return sprintf('PRE-%s-%06d', $year, $next);
    }
}
