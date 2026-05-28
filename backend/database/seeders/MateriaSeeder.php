<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MateriaSeeder extends Seeder
{
    public function run(): void
    {
        $materias = [
            ['nombre' => 'Computación', 'codigo' => 'COMP'],
            ['nombre' => 'Matemáticas', 'codigo' => 'MAT'],
            ['nombre' => 'Inglés', 'codigo' => 'ING'],
            ['nombre' => 'Física', 'codigo' => 'FIS'],
        ];

        foreach ($materias as $materia) {
            DB::table('materias')->updateOrInsert(
                ['codigo' => $materia['codigo']],
                array_merge($materia, [
                    'estado' => 'activo',
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }
    }
}
