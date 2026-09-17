<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Student;
use App\Services\Student\StudentPhotoService;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Serves a student's profile photo. Outside both auth groups on purpose: an
 * `<img>` in the admin panel and `expo-image` in the app send no credentials, so
 * the link's own signature is the authorization. Links are minted only for the
 * student themselves (`StudentProfileResource`) or an admin who can view the
 * record (`StudentResource`).
 */
class StudentPhotoController extends Controller
{
    public function __construct(private readonly StudentPhotoService $photos) {}

    public function __invoke(Student $student): BinaryFileResponse
    {
        return $this->photos->fileResponse($student);
    }
}
