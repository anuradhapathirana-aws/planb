<?php

declare(strict_types=1);

namespace Tests\Feature\Console;

use App\Enums\CourseStatus;
use App\Models\CourseProgramme;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CheckPlayReadinessTest extends TestCase
{
    use RefreshDatabase;

    /** The settings a release needs, as they should look on a healthy server. */
    private function configureReadyEnvironment(): void
    {
        config([
            'legal.support_address' => 'support@planb.test',
            'play_review.email' => 'play-review@planb.test',
            'play_review.code' => '482915',
            'payments.enabled' => false,
        ]);

        CourseProgramme::factory()->create([
            'status' => CourseStatus::Published,
            'price_cents' => 0,
        ]);
    }

    public function test_it_passes_when_the_environment_is_ready(): void
    {
        $this->configureReadyEnvironment();

        $this->artisan('check:play-readiness')
            ->expectsOutputToContain('Ready for release.')
            ->assertSuccessful();
    }

    public function test_it_fails_when_the_reviewer_cannot_sign_in(): void
    {
        $this->configureReadyEnvironment();
        config(['play_review.code' => '']);

        $this->artisan('check:play-readiness')
            ->expectsOutputToContain('Reviewer sign-in')
            ->assertFailed();
    }

    /** A guessable code is as good as none: Play publishes it to whoever reviews. */
    public function test_it_fails_on_a_sequence_review_code(): void
    {
        $this->configureReadyEnvironment();
        config(['play_review.code' => '123456']);

        $this->artisan('check:play-readiness')->assertFailed();
    }

    public function test_it_fails_without_a_support_address(): void
    {
        $this->configureReadyEnvironment();
        config(['legal.support_address' => '']);

        $this->artisan('check:play-readiness')
            ->expectsOutputToContain('Support address')
            ->assertFailed();
    }

    /** A reviewer who finds only locked content reports an app that does nothing. */
    public function test_it_fails_when_no_free_course_is_published(): void
    {
        $this->configureReadyEnvironment();
        CourseProgramme::query()->update(['price_cents' => 500000]);

        $this->artisan('check:play-readiness')
            ->expectsOutputToContain('Free course')
            ->assertFailed();
    }

    public function test_it_fails_while_payments_are_on(): void
    {
        $this->configureReadyEnvironment();
        config(['payments.enabled' => true]);

        $this->artisan('check:play-readiness')
            ->expectsOutputToContain('Payments')
            ->assertFailed();
    }
}
