<?php

declare(strict_types=1);

namespace Tests\Feature\Legal;

use Tests\TestCase;

class PolicyPagesTest extends TestCase
{
    /** Google Play and the app's sign-in screen open these before anyone is signed in. */
    public function test_the_privacy_policy_is_public_and_covers_what_google_play_checks(): void
    {
        config(['legal.support_address' => 'support@planb.test']);

        $this->get('/privacy')
            ->assertOk()
            ->assertSee('Privacy Policy')
            ->assertSee('Plan B International Private Limited')
            // What is collected, who it is shared with, how to delete, and a contact.
            ->assertSee('The data we collect')
            ->assertSee('Who we share your data with')
            ->assertSee('Employers and recruitment agencies')
            ->assertSee(route('legal.account-deletion'), false)
            ->assertSee('mailto:support@planb.test', false)
            ->assertSee('18 or older')
            ->assertSee('Last updated');
    }

    public function test_the_terms_are_public_and_state_the_agreed_rules(): void
    {
        $this->get('/terms')
            ->assertOk()
            ->assertSee('Terms of Use')
            ->assertSee('18 or older')
            ->assertSee('no refund once you have opened any lesson')
            ->assertSee('do not guarantee a job, a visa')
            ->assertSee('laws of')
            ->assertSee('Sri Lanka');
    }

    /** Unfilled company details are left out, never printed as blanks or placeholders. */
    public function test_blank_company_details_are_left_out(): void
    {
        config(['legal.company_address' => null, 'legal.company_registration_number' => null]);

        $this->get('/privacy')
            ->assertOk()
            ->assertDontSee('Registered address')
            ->assertDontSee('Company registration number');

        config(['legal.company_address' => '12 Galle Road, Colombo 03']);

        $this->get('/privacy')->assertSee('Registered address: 12 Galle Road, Colombo 03');
    }

    public function test_every_legal_page_links_to_the_others(): void
    {
        foreach (['/privacy', '/terms', '/account-deletion'] as $page) {
            $this->get($page)
                ->assertOk()
                ->assertSee(route('legal.privacy'), false)
                ->assertSee(route('legal.terms'), false)
                ->assertSee(route('legal.account-deletion'), false);
        }
    }
}
