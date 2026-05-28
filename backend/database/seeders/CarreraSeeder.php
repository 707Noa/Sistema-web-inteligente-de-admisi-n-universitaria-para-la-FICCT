<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CarreraSeeder extends Seeder
{
    public function run(): void
    {
        $carreras = [
            ['nombre' => 'Ingeniería en Sistemas', 'codigo' => 'SIS', 'plan' => '2024', 'modalidad' => 'Presencial', 'area' => 'Tecnología'],
            ['nombre' => 'Ingeniería en Robótica', 'codigo' => 'ROB', 'plan' => '2024', 'modalidad' => 'Presencial', 'area' => 'Tecnología'],
            ['nombre' => 'Ingeniería Informática', 'codigo' => 'INF', 'plan' => '2024', 'modalidad' => 'Presencial', 'area' => 'Tecnología'],
            ['nombre' => 'Ingeniería en Redes y Telecomunicaciones', 'codigo' => 'RED', 'plan' => '2024', 'modalidad' => 'Presencial', 'area' => 'Tecnología'],
        ];

        foreach ($carreras as $carrera) {
            DB::table('carreras')->updateOrInsert(
                ['codigo' => $carrera['codigo']],
                array_merge($carrera, [
                    'estado' => 'activo',
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }
    }
}
