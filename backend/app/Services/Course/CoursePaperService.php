<?php

declare(strict_types=1);

namespace App\Services\Course;

use App\Models\CoursePaper;
use App\Models\CourseProgramme;
use App\Models\CourseQuestion;
use App\Support\HtmlSanitizer;
use Illuminate\Support\Facades\DB;

class CoursePaperService
{
    /**
     * Creates or replaces the programme's paper and its whole question tree in
     * one transaction — the builder submits all of it at once, and a paper that
     * saved half its questions would quietly change what students are marked on.
     */
    public function save(CourseProgramme $programme, array $data): CoursePaper
    {
        return DB::transaction(function () use ($programme, $data): CoursePaper {
            $paper = $programme->paper()->firstOrNew([]);

            $paper->fill([
                'title' => $data['title'],
                'instructions' => HtmlSanitizer::clean($data['instructions'] ?? null),
                'pass_mark' => $data['pass_mark'] ?? CoursePaper::DEFAULT_PASS_MARK,
                // Absent or null both mean "unlimited retries" (FR-MOB-024).
                'max_attempts' => $data['max_attempts'] ?? null,
                'requires_all_videos_watched' => $data['requires_all_videos_watched'] ?? true,
            ]);

            $programme->paper()->save($paper);

            $this->syncQuestions($paper, $data['questions'] ?? []);

            return $this->loadTree($paper);
        });
    }

    public function delete(CoursePaper $paper): void
    {
        // Hard delete: questions and options cascade. Nothing references a paper
        // yet — student attempts arrive with the student area and will need this
        // revisited before any real result history exists.
        $paper->delete();
    }

    public function loadTree(CoursePaper $paper): CoursePaper
    {
        return $paper->load(['questions.options'])->loadCount('questions');
    }

    /**
     * Reconciles the submitted questions against what is stored: rows carrying an
     * `id` are updated in place, rows without one are created, and anything the
     * admin removed from the builder is deleted.
     *
     * @param  list<array<string, mixed>>  $questions
     */
    private function syncQuestions(CoursePaper $paper, array $questions): void
    {
        $keptQuestionIds = [];

        foreach ($questions as $position => $question) {
            $attributes = [
                'text' => $question['text'],
                'type' => $question['type'],
                'sort_order' => $position,
            ];

            $model = isset($question['id'])
                ? $paper->questions()->whereKey($question['id'])->first()
                : null;

            if ($model === null) {
                $model = $paper->questions()->create($attributes);
            } else {
                $model->update($attributes);
            }

            $keptQuestionIds[] = $model->id;
            $this->syncOptions($model, $question['options'] ?? []);
        }

        $paper->questions()
            ->when($keptQuestionIds !== [], fn ($query) => $query->whereNotIn('id', $keptQuestionIds))
            ->delete();
    }

    /**
     * @param  list<array<string, mixed>>  $options
     */
    private function syncOptions(CourseQuestion $question, array $options): void
    {
        $keptOptionIds = [];

        foreach ($options as $position => $option) {
            $attributes = [
                'text' => $option['text'],
                'is_correct' => (bool) ($option['is_correct'] ?? false),
                'sort_order' => $position,
            ];

            $model = isset($option['id'])
                ? $question->options()->whereKey($option['id'])->first()
                : null;

            if ($model === null) {
                $model = $question->options()->create($attributes);
            } else {
                $model->update($attributes);
            }

            $keptOptionIds[] = $model->id;
        }

        $question->options()
            ->when($keptOptionIds !== [], fn ($query) => $query->whereNotIn('id', $keptOptionIds))
            ->delete();
    }
}
