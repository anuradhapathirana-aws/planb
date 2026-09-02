<?php

declare(strict_types=1);

namespace App\Services\Student;

use App\Models\Student;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Intervention\Image\ImageManager;

class StudentManagementService
{
    /**
     * @param  array{search?: string, status?: string, visa_status?: string, sort?: string, direction?: string, per_page?: int}  $filters
     */
    public function list(array $filters): LengthAwarePaginator
    {
        $query = Student::query()->with(['industry', 'profession', 'media']);

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('student_id', 'like', "%{$search}%")
                    ->orWhere('full_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if (($filters['status'] ?? null) === 'blocked') {
            $query->where('is_blocked', true);
        } elseif (($filters['status'] ?? null) === 'active') {
            $query->where('is_blocked', false);
        } elseif (($filters['status'] ?? null) === 'registered') {
            $query->whereNotNull('registered_at');
        } elseif (($filters['status'] ?? null) === 'pending') {
            $query->whereNull('registered_at');
        }

        if (! empty($filters['visa_status'])) {
            $query->where('visa_status', $filters['visa_status']);
        }

        $sortable = ['student_id', 'full_name', 'created_at', 'registered_at'];
        $sort = in_array($filters['sort'] ?? null, $sortable, true) ? $filters['sort'] : 'created_at';
        $direction = ($filters['direction'] ?? null) === 'asc' ? 'asc' : 'desc';

        return $query->orderBy($sort, $direction)
            ->paginate($filters['per_page'] ?? 15)
            ->withQueryString();
    }

    public function create(array $data): Student
    {
        $data['student_id'] = $this->nextStudentId();

        return Student::create($data)->load(['industry', 'profession', 'media']);
    }

    /**
     * Generates the next sequential Plan B student ID (PB-10001, PB-10002, ...).
     * Locks matching rows for the duration of the transaction so two concurrent
     * "Add student" submissions can't be handed the same number.
     */
    private function nextStudentId(): string
    {
        return DB::transaction(function () {
            return $this->formatStudentId($this->nextStudentNumber(lock: true));
        });
    }

    /**
     * Read-only preview of the ID the next "Add student" submission would get,
     * so the admin can see it before saving. Not reserved — a concurrent create
     * (or CSV import landing on the same number) can still take it first, in
     * which case the create form simply shows a different, still-unused ID.
     */
    public function previewNextStudentId(): string
    {
        return $this->formatStudentId($this->nextStudentNumber(lock: false));
    }

    private function nextStudentNumber(bool $lock): int
    {
        $query = Student::withTrashed()->where('student_id', 'like', 'PB-%');

        if ($lock) {
            $query->lockForUpdate();
        }

        $last = $query->orderByRaw('CAST(SUBSTRING(student_id, 4) AS UNSIGNED) DESC')->value('student_id');

        return $last ? ((int) substr($last, 3)) + 1 : 10001;
    }

    private function formatStudentId(int $number): string
    {
        return "PB-{$number}";
    }

    public function update(Student $student, array $data): Student
    {
        $student->update($data);

        return $student->fresh(['industry', 'profession', 'media']);
    }

    public function block(Student $student): Student
    {
        $student->update(['is_blocked' => true]);

        // Blocking must take effect now, not whenever the student's mobile token
        // happens to expire. `EnsureStudentIsActive` covers a token minted in the
        // same instant; this covers every token already out there.
        $student->tokens()->delete();

        // Any code already emailed would otherwise still mint a fresh token.
        $student->loginCodes()->live()->update(['voided_at' => now()]);

        return $student;
    }

    public function unblock(Student $student): Student
    {
        $student->update(['is_blocked' => false]);

        return $student;
    }

    public function delete(Student $student): void
    {
        $student->tokens()->delete();
        $student->loginCodes()->live()->update(['voided_at' => now()]);

        $student->delete();
    }

    /**
     * Re-encodes the uploaded photo (strips EXIF/metadata, normalizes format, caps
     * dimensions) before handing it to Spatie Media Library — per CLAUDE.md §7.4,
     * uploaded images are never stored as-received.
     */
    public function updatePhoto(Student $student, UploadedFile $file): Student
    {
        $encoded = ImageManager::gd()
            ->read($file->getRealPath())
            ->cover(600, 600)
            ->toJpeg(85);

        $tempPath = tempnam(sys_get_temp_dir(), 'planb_avatar_').'.jpg';
        file_put_contents($tempPath, (string) $encoded);

        $student->addMedia($tempPath)
            ->usingFileName($student->student_id.'.jpg')
            ->toMediaCollection('profile_photo');

        return $student->fresh();
    }

    public function removePhoto(Student $student): Student
    {
        $student->clearMediaCollection('profile_photo');

        return $student->fresh();
    }

    /**
     * Bulk-import Student IDs (and, optionally, any already-known profile fields)
     * from an admin-supplied CSV before students self-register on the mobile app.
     *
     * Expected header row (case-insensitive): student_id (required), full_name,
     * email, contact_number — any columns beyond student_id are optional.
     *
     * @return array{imported: int, skipped: int, failed: int, errors: list<array{row: int, student_id: string|null, message: string}>}
     */
    public function import(UploadedFile $file, User $importer): array
    {
        $handle = new \SplFileObject($file->getRealPath());
        $handle->setFlags(\SplFileObject::READ_CSV | \SplFileObject::SKIP_EMPTY | \SplFileObject::DROP_NEW_LINE);

        $header = null;
        $imported = 0;
        $skipped = 0;
        $errors = [];
        $rowNumber = 1;

        foreach ($handle as $row) {
            if ($row === [null] || $row === false) {
                continue;
            }

            if ($header === null) {
                $header = array_map(fn ($col) => strtolower(trim((string) $col)), $row);
                $rowNumber++;

                continue;
            }

            $rowNumber++;
            $record = array_combine($header, array_pad($row, count($header), null));
            $studentId = isset($record['student_id']) ? trim((string) $record['student_id']) : null;

            if (empty($studentId)) {
                $errors[] = ['row' => $rowNumber, 'student_id' => null, 'message' => 'Missing student_id.'];

                continue;
            }

            if (Student::where('student_id', $studentId)->exists()) {
                $skipped++;

                continue;
            }

            try {
                DB::transaction(function () use ($record, $studentId, $importer) {
                    Student::create([
                        'student_id' => $studentId,
                        'full_name' => $this->nullableColumn($record, 'full_name'),
                        'email' => $this->nullableColumn($record, 'email'),
                        'contact_number' => $this->nullableColumn($record, 'contact_number'),
                        'imported_by' => $importer->id,
                    ]);
                });
                $imported++;
            } catch (\Throwable $e) {
                $errors[] = ['row' => $rowNumber, 'student_id' => $studentId, 'message' => 'Could not save this row (possible duplicate email).'];
            }
        }

        return [
            'imported' => $imported,
            'skipped' => $skipped,
            'failed' => count($errors),
            'errors' => $errors,
        ];
    }

    private function nullableColumn(array $record, string $key): ?string
    {
        $value = $record[$key] ?? null;
        $value = is_string($value) ? trim($value) : $value;

        return empty($value) ? null : $value;
    }
}
