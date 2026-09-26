{{--
    Plain-text part of emails.notice. Unescaped on purpose, as in code-text: this
    is text/plain. Every value is written by our own notifications, never by a user.
--}}
{!! $heading !!}

@foreach ($lines as $line)
{!! $line !!}

@endforeach
@if ($footnote)
{!! $footnote !!}

@endif
--
@if (config('mail.support_address'))
Need help? Email us at {!! config('mail.support_address') !!}.
@endif
This is an automatic message. Please don't reply to it.
Plan B International Private Limited
