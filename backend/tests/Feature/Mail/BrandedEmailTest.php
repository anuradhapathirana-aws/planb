<?php

declare(strict_types=1);

namespace Tests\Feature\Mail;

use App\Models\Student;
use App\Models\User;
use App\Notifications\AdminAccountLockedNotification;
use App\Notifications\StudentAccountDeletionCodeNotification;
use App\Notifications\StudentLoginCodeNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Mail\Events\MessageSent;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Symfony\Component\Mime\Email;
use Tests\TestCase;

class BrandedEmailTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Actually send through the `array` mailer (phpunit.xml) and hand back what
     * went out — rendering alone would skip the logo embed, which only happens
     * when there is a real message to attach it to.
     */
    private function send(object $notifiable, object $notification): Email
    {
        $sent = null;

        Event::listen(MessageSent::class, function (MessageSent $event) use (&$sent): void {
            $sent = $event->message;
        });

        Notification::sendNow($notifiable, $notification);

        $this->assertInstanceOf(Email::class, $sent, 'No email was sent.');

        return $sent;
    }

    public function test_the_sign_in_code_email_is_branded_and_carries_the_code(): void
    {
        config(['mail.support_address' => 'support@planb.test']);
        $student = Student::factory()->create(['email' => 'nimal@example.com']);

        $email = $this->send($student, new StudentLoginCodeNotification('482915', 10));

        $html = (string) $email->getHtmlBody();
        $text = (string) $email->getTextBody();

        $this->assertSame('Your Plan B sign-in code', $email->getSubject());
        $this->assertStringContainsString('482915', $html);
        $this->assertStringContainsString('PLAN B ACADEMY', $html);
        $this->assertStringContainsString('expires in 10 minutes', $html);
        $this->assertStringContainsString('support@planb.test', $html);

        // A plain-text part for mail apps that don't show HTML, not HTML-escaped.
        $this->assertStringContainsString('482915', $text);
        $this->assertStringContainsString("didn't try to sign in", $text);

        // The logo travels inside the email, so it shows without a public URL.
        $this->assertStringContainsString('cid:', $html);
        $this->assertNotEmpty($email->getAttachments());
    }

    /** Subjects and preheaders show on a locked phone; a code must never be in either. */
    public function test_a_code_never_appears_in_the_subject_or_preview_text(): void
    {
        $student = Student::factory()->create(['email' => 'nimal@example.com']);

        foreach ([
            new StudentLoginCodeNotification('482915', 10),
            new StudentAccountDeletionCodeNotification('482915', 10),
        ] as $notification) {
            $email = $this->send($student, $notification);

            $this->assertStringNotContainsString('482915', (string) $email->getSubject());

            preg_match('/<div style="display:none;[^"]*">\s*(.*?)\s*<\/div>/s', (string) $email->getHtmlBody(), $preheader);
            $this->assertNotEmpty($preheader[1] ?? null, 'The preheader should be present.');
            $this->assertStringNotContainsString('482915', $preheader[1]);
        }
    }

    public function test_the_deletion_code_email_says_it_cannot_be_undone(): void
    {
        $student = Student::factory()->create(['email' => 'nimal@example.com']);

        $email = $this->send($student, new StudentAccountDeletionCodeNotification('730216', 10));

        $this->assertSame('Confirm deleting your Plan B account', $email->getSubject());
        $this->assertStringContainsString('730216', (string) $email->getHtmlBody());
        $this->assertStringContainsString('be undone', (string) $email->getHtmlBody());
    }

    public function test_the_admin_unlock_email_has_a_working_link_in_both_parts(): void
    {
        $admin = User::factory()->create();

        $email = $this->send($admin, new AdminAccountLockedNotification);

        $text = (string) $email->getTextBody();

        $this->assertStringContainsString('Unlock my account', (string) $email->getHtmlBody());

        // The signed URL's `&` must survive in the plain-text part, or the link breaks.
        preg_match('/Unlock my account: (\S+)/', $text, $link);
        $this->assertNotEmpty($link[1] ?? null);
        $this->assertStringContainsString('signature=', $link[1]);
        $this->assertStringNotContainsString('&amp;', $link[1]);
    }

    public function test_the_support_line_is_hidden_when_no_address_is_configured(): void
    {
        config(['mail.support_address' => null]);
        $student = Student::factory()->create(['email' => 'nimal@example.com']);

        $email = $this->send($student, new StudentLoginCodeNotification('482915', 10));

        $this->assertStringNotContainsString('Need help?', (string) $email->getHtmlBody());
    }

    public function test_the_test_email_command_sends_a_sample(): void
    {
        $this->artisan('mail:test', ['email' => 'owner@example.com'])->assertSuccessful();

        $this->artisan('mail:test', ['email' => 'not-an-email'])->assertFailed();
    }
}
