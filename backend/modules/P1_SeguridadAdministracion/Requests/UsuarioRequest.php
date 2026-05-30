<?php
namespace Modules\P1_SeguridadAdministracion\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UsuarioRequest extends FormRequest
{
    public function authorize() { return true; }
    public function rules() { return ['name'=>'required','email'=>'required|email']; }
}
