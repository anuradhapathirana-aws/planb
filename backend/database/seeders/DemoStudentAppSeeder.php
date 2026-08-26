<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\CourseStatus;
use App\Enums\QuestionType;
use App\Enums\VisaStatus;
use App\Models\CourseCategory;
use App\Models\CoursePaper;
use App\Models\CourseProgramme;
use App\Models\CourseQuestion;
use App\Models\CourseQuestionOption;
use App\Models\CourseTopic;
use App\Models\CourseVideo;
use App\Models\Student;
use Illuminate\Database\Seeder;

/**
 * Local demo data for the mobile app.
 *
 * Not part of `DatabaseSeeder` — run it explicitly:
 *
 *     php artisan db:seed --class=DemoStudentAppSeeder
 *
 * Creates one known student you can sign in as, and one published course with
 * an assessment. Lesson *files* are not seeded: a playable MP4 can't be
 * fabricated meaningfully, so upload one through the admin panel to exercise
 * the player. Everything else works without it.
 */
class DemoStudentAppSeeder extends Seeder
{
    public const DEMO_EMAIL = 'student@planb.test';

    public function run(): void
    {
        $student = Student::withTrashed()->firstOrNew(['email' => self::DEMO_EMAIL]);

        $student->fill([
            'student_id' => $student->student_id ?? 'PB-00001',
            'full_name' => 'Nimal Perera',
            'contact_number' => '0771234567',
            'address' => '12 Galle Road, Colombo 03',
            'date_of_birth' => '1999-04-12',
            'highest_qualification' => 'A/L',
            'visa_status' => VisaStatus::Employment,
            'languages_spoken' => ['Sinhala', 'English'],
            'is_blocked' => false,
            // Left null so the first sign-in exercises the real "claim" path.
            'registered_at' => null,
        ]);

        $student->deleted_at = null;
        $student->save();

        $category = CourseCategory::firstOrCreate(
            ['name' => 'UAE Migration Readiness'],
            ['description' => 'Everything you need before you fly.', 'is_active' => true, 'sort_order' => 1],
        );

        $programme = CourseProgramme::firstOrNew([
            'course_category_id' => $category->id,
            'name' => 'Before You Fly',
        ]);

        $programme->fill([
            'description' => 'Visas, documents and what to expect on arrival.',
            // Set directly rather than through CourseProgrammeService::publish(),
            // which (correctly) refuses a programme whose lessons have no files.
            'status' => CourseStatus::Published,
            'sort_order' => 1,
        ])->save();

        if ($programme->topics()->count() === 0) {
            $this->seedTopics($programme);
        }

        if ($programme->paper === null) {
            $this->seedPaper($programme);
        }

        $this->command?->info('Demo student: '.self::DEMO_EMAIL.' ('.$student->student_id.')');
        $this->command?->info('Demo course: '.$programme->name.' [published]');
        $this->command?->warn('Upload a lesson video via the admin panel to test playback.');
    }

    private function seedTopics(CourseProgramme $programme): void
    {
        $structure = [
            'Understanding your visa' => [
                ['Visit vs employment visa', 240],
                ['Documents you must carry', 315],
            ],
            'Arriving in the UAE' => [
                ['At the airport', 280],
                ['Your first week', 420],
            ],
        ];

        $topicOrder = 0;

        foreach ($structure as $title => $lessons) {
            $topic = CourseTopic::create([
                'course_programme_id' => $programme->id,
                'title' => $title,
                'description' => '<p>What this section covers and why it matters.</p>',
                'sort_order' => $topicOrder,
            ]);

            foreach ($lessons as $index => [$lessonTitle, $duration]) {
                CourseVideo::create([
                    'course_topic_id' => $topic->id,
                    'title' => $lessonTitle,
                    'duration_seconds' => $duration,
                    'sort_order' => $index,
                ]);
            }

            $topicOrder++;
        }
    }

    private function seedPaper(CourseProgramme $programme): void
    {
        $paper = CoursePaper::create([
            'course_programme_id' => $programme->id,
            'title' => 'Before You Fly — assessment',
            'instructions' => '<p>Answer every question. You need 70% to pass.</p>',
            'pass_mark' => 70,
            'max_attempts' => 3,
            // Off for the demo, so the assessment is reachable without a
            // playable video file.
            'requires_all_videos_watched' => false,
        ]);

        $questions = [
            [
                'text' => 'Can you work in the UAE on a visit visa?',
                'type' => QuestionType::YesNo,
                'options' => [['No', true], ['Yes', false]],
            ],
            [
                'text' => 'How long should your passport be valid on arrival?',
                'type' => QuestionType::MultipleChoice,
                'options' => [['At least 6 months', true], ['At least 1 month', false], ['Any validity', false]],
            ],
            [
                'text' => 'Who holds your employment contract copy?',
                'type' => QuestionType::MultipleChoice,
                'options' => [['You keep a copy', true], ['Only the employer', false], ['Nobody needs one', false]],
            ],
        ];

        foreach ($questions as $index => $data) {
            $question = CourseQuestion::create([
                'course_paper_id' => $paper->id,
                'text' => $data['text'],
                'type' => $data['type'],
                'sort_order' => $index,
            ]);

            foreach ($data['options'] as $optionIndex => [$text, $isCorrect]) {
                CourseQuestionOption::create([
                    'course_question_id' => $question->id,
                    'text' => $text,
                    'is_correct' => $isCorrect,
                    'sort_order' => $optionIndex,
                ]);
            }
        }
    }
}
