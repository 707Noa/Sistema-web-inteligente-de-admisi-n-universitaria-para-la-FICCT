<?php
namespace Modules\P3_EvaluacionResultados\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ExamenRequest extends FormRequest
{
    public function authorize() { return true; }
    public function rules() { return ['nota_1'=>'numeric|min:0|max:100','nota_2'=>'numeric|min:0|max:100','nota_3'=>'numeric|min:0|max:100']; }
}
