<?php
namespace Modules\P2_ParticipantesGrupos\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PostulanteRequest extends FormRequest
{
    public function authorize() { return true; }
    public function rules() { return ['nombre'=>'required','dni'=>'required']; }
}
