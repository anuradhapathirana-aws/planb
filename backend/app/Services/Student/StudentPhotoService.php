<?php

declare(strict_types=1);

namespace App\Services\Student;

use App\Models\Student;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\URL;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * Hands out a student's profile photo as a signed link, never a storage URL.
 *
 * Photos used to be public at `/storage/{mediaId}/{student_id}.jpg` — both
 * numbers sequential, so every student's face could be downloaded in a loop
 * without signing in. They now live on the private document disk under a random
 * name and are only readable through `student-photos.show`.
 *
 * **The link is stable for an hour.** A link that changed on every request would
 * defeat the app's image cache (expo-image keys its disk cache on the URL), so
 * every profile screen would re-download the photo on a student's mobile data.
 * Expiry is rounded to the hour instead: the same URL comes back all hour, and
 * any link is valid for between one and two hours. `v` is the media id, so a new
 * photo is a new URL straight away.
 */
class StudentPhotoService
{
    public function url(Student $student): ?string
    {
        $media = $student->photoMedia();

        if ($media === null) {
            return null;
        }

        return URL::temporarySignedRoute('student-photos.show', $this->expiry(), [
            'student' => $student->id,
            'v' => $media->id,
        ]);
    }

    public function fileResponse(Student $student): BinaryFileResponse
    {
        $media = $student->photoMedia();

        // A photo still on the old public disk is not served from here until
        // `students:migrate-photos` has moved it.
        abort_if($media === null || $media->disk !== Student::DOCUMENT_DISK, Response::HTTP_NOT_FOUND);

        $path = $media->getPath();

        abort_unless(is_file($path), Response::HTTP_NOT_FOUND);

        return response()->file($path, [
            'Content-Type' => $media->mime_type,
            // Private: a shared proxy must not keep one student's face for another
            // request. An hour matches how long the link itself stays the same.
            'Cache-Control' => 'private, max-age=3600',
            'X-Content-Type-Options' => 'nosniff',
        ])
            // response()->file() marks every file `public`, overriding the header above.
            ->setPrivate();
    }

    private function expiry(): Carbon
    {
        return now()->startOfHour()->addHours(2);
    }
}
