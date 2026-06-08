<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            AdminSeeder::class,
            CarreraSeeder::class,
            MateriaSeeder::class,
            DocenteSeeder::class,
            AcademicoSeeder::class,
            TemaSeeder::class,
            PostulanteSeeder::class,
        ]);
    }
}
