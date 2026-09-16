<?php

declare(strict_types=1);

namespace Tests\Feature\Legal;

use Tests\TestCase;

class AccountDeletionPageTest extends TestCase
{
    /** Google Play opens this from the store listing, so it must work signed out. */
    public function test_the_page_is_public_and_names_the_app_and_developer(): void
    {
        $this->get('/account-deletion')
            ->assertOk()
            ->assertSee('Delete your Plan B Academy account')
            ->assertSee('Plan B International Private Limited')
            ->assertSee('Email me a code')
            ->assertSee('What we delete')
            ->assertSee('What we keep');
    }

    public function test_it_shows_the_support_address_and_the_retention_period(): void
    {
        config([
            'legal.support_address' => 'support@planb.test',
            'legal.payment_record_retention_years' => 7,
            'legal.deletion_request_days' => 30,
        ]);

        $this->get('/account-deletion')
            ->assertOk()
            ->assertSee('mailto:support@planb.test', false)
            ->assertSee('7 years')
            ->assertSee('within 30 days');
    }

    /** No address configured yet: never render a broken or empty mailto link. */
    public function test_it_has_no_mailto_link_when_no_support_address_is_set(): void
    {
        config(['legal.support_address' => null]);

        $this->get('/account-deletion')
            ->assertOk()
            ->assertDontSee('mailto:', false)
            ->assertSee('Plan B support email (coming soon)');
    }
}
