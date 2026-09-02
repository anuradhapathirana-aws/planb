<?php

declare(strict_types=1);

namespace App\Services\Student;

use App\Enums\StudentDocumentType;
use App\Models\Student;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * The private files on a student record — CV and profile video.
 *
 * Neither is ever handed out as a storage URL. An admin asks this service for a
 * short-lived signed link and the bytes come back through the signed route, so a
 * link that leaks out of the panel stops working and nothing is guessable from
 * the record's id (CLAUDE.md §7.11, and the same reasoning as lesson videos).
 */
class StudentDocumentService
{
    /** Well inside the 2-hour ceiling; long enough to read a CV or watch 3 minutes. */
    private const LINK_MINUTES = 30;

    public function attach(Student $student, StudentDocumentType $type, UploadedFile $file): Student
    {
        $student->addMedia($file->getRealPath())
            ->usingFileName($this->safeFileName($student, $type, $file))
            ->withCustomProperties(['original_name' => $file->getClientOriginalName()])
            ->toMediaCollection($type->collection());

        return $student->fresh(['media']);
    }

    public function remove(Student $student, StudentDocumentType $type): Student
    {
        $student->clearMediaCollection($type->collection());

        return $student->fresh(['media']);
    }

    /**
     * @return array{url: string, expires_at: string}
     */
    public function link(Student $student, StudentDocumentType $type): array
    {
        $expiresAt = now()->addMinutes(self::LINK_MINUTES);

        return [
            'url' => URL::temporarySignedRoute('student-documents.show', $expiresAt, [
                'student' => $student->id,
                'document' => $type->value,
            ]),
            'expires_at' => $expiresAt->toIso8601String(),
        ];
    }

    /**
     * Serves the bytes. `response()->file()` answers `Range` requests, which is
     * what lets the video element seek instead of buffering the whole clip, and
     * what lets a PDF viewer render page one before the file has finished.
     */
    public function fileResponse(Student $student, StudentDocumentType $type): BinaryFileResponse
    {
        $media = $student->getFirstMedia($type->collection());

        abort_if($media === null, Response::HTTP_NOT_FOUND);

        $path = $media->getPath();

        abort_unless(is_file($path), Response::HTTP_NOT_FOUND);

        return response()->file($path, [
            'Content-Type' => $media->mime_type,
            'Accept-Ranges' => 'bytes',
            // The link expires, so nothing downstream should keep a copy.
            'Cache-Control' => 'private, no-store',
            'Content-Disposition' => 'inline; filename="'.$media->file_name.'"',
            // A PDF is rendered, never sniffed into something executable.
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /** Keeps the stored name predictable, free of PII, and free of anything path-like. */
    private function safeFileName(Student $student, StudentDocumentType $type, UploadedFile $file): string
    {
        $extension = strtolower($file->getClientOriginalExtension())
            ?: ($type === StudentDocumentType::Cv ? 'pdf' : 'mp4');

        return Str::slug($student->student_id.'-'.$type->value).'.'.$extension;
    }
}
