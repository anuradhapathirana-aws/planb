{{--
    Plain-text part of emails.code, for mail apps that do not show HTML.
    Unescaped on purpose: this is text/plain, and `{{ }}` would print "don't" as
    "don&#039;t". Every value is written by our own notifications, never by a user.
--}}
{!! $heading !!}

{!! $intro !!}

    {!! $code !!}

This code expires in {!! $ttlMinutes !!} minutes and can only be used once.

{!! $warning !!}

Plan B will never ask you for this code by phone, WhatsApp or email.

--
@if (config('mail.support_address'))
Need help? Email us at {!! config('mail.support_address') !!}.
@endif
This is an automatic message. Please don't reply to it.
Plan B International Private Limited
