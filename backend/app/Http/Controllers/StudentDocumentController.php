<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\StudentDocumentType;
use App\Models\Student;
use App\Services\Student\StudentDocumentService;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Serves a student's CV or profile video. Deliberately outside the admin auth
 * group: a `<video>` element and a PDF viewer fetch their source as a plain
 * request that carries no session cookie, so the link's own signature is the
 * authorization (`signed` middleware — CLAUDE.md §7.11). Links are minted only
 * by `documentLink`, which does run the `view` policy check.
 */
class StudentDocumentController extends Controller
{
    public function __construct(private readonly StudentDocumentService $documents) {}

    public function __invoke(Student $student, StudentDocumentType $document): BinaryFileResponse
    {
        return $this->documents->fileResponse($student, $document);
    }
}
