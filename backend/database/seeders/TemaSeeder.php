<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TemaSeeder extends Seeder
{
    public function run(): void
    {
        $materias = DB::table('materias')->get();

        $temasPorMateria = [
            'COMP' => [
                ['numero' => 1, 'titulo' => 'Introducción a la Computación', 'descripcion' => 'Conceptos básicos, hardware y software.'],
                ['numero' => 2, 'titulo' => 'Algoritmos', 'descripcion' => 'Pseudocódigo, diagramas de flujo y estructuras condicionales.'],
                ['numero' => 3, 'titulo' => 'Programación básica', 'descripcion' => 'Variables, bucles y lógica de programación en Python.'],
                ['numero' => 4, 'titulo' => 'Evaluación final', 'descripcion' => 'Proyecto final de programación y examen práctico.'],
            ],
            'MAT' => [
                ['numero' => 1, 'titulo' => 'Álgebra y Aritmética', 'descripcion' => 'Ecuaciones, inecuaciones y sistemas de ecuaciones.'],
                ['numero' => 2, 'titulo' => 'Funciones y Gráficos', 'descripcion' => 'Funciones lineales, cuadráticas y exponenciales.'],
                ['numero' => 3, 'titulo' => 'Geometría Analítica', 'descripcion' => 'La recta, la circunferencia y la parábola.'],
                ['numero' => 4, 'titulo' => 'Trigonometría', 'descripcion' => 'Identidades trigonométricas y resolución de triángulos.'],
            ],
            'ING' => [
                ['numero' => 1, 'titulo' => 'Present Simple & Continuous', 'descripcion' => 'Daily routines and current actions.'],
                ['numero' => 2, 'titulo' => 'Past Simple & Tenses', 'descripcion' => 'Talking about past experiences and history.'],
                ['numero' => 3, 'titulo' => 'Vocabulary and Reading', 'descripcion' => 'Expanding academic vocabulary and comprehension.'],
                ['numero' => 4, 'titulo' => 'Final Oral Project', 'descripcion' => 'Speaking presentation and written test.'],
            ],
            'FIS' => [
                ['numero' => 1, 'titulo' => 'Vectores y Cinemática', 'descripcion' => 'Movimiento rectilíneo uniforme y movimiento parabólico.'],
                ['numero' => 2, 'titulo' => 'Dinámica y Trabajo', 'descripcion' => 'Leyes de Newton y fuerzas de fricción.'],
                ['numero' => 3, 'titulo' => 'Energía y Calor', 'descripcion' => 'Conservación de la energía y termodinámica básica.'],
                ['numero' => 4, 'titulo' => 'Electricidad Básica', 'descripcion' => 'Ley de Ohm, circuitos en serie y paralelo.'],
            ],
        ];

        foreach ($materias as $materia) {
            $codigo = $materia->codigo;
            if (isset($temasPorMateria[$codigo])) {
                foreach ($temasPorMateria[$codigo] as $tema) {
                    DB::table('temas')->updateOrInsert(
                        [
                            'materia_id' => $materia->id,
                            'numero' => $tema['numero'],
                        ],
                        [
                            'titulo' => $tema['titulo'],
                            'descripcion' => $tema['descripcion'],
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]
                    );
                }
            }
        }
    }
}
