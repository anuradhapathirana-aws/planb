{{--
    Plain-text part of emails.action. Unescaped on purpose, as in code-text: in
    text/plain, `{{ }}` would turn the `&` in a signed URL into `&amp;` and break
    the link. Every value is written by our own notifications, never by a user.
--}}
{!! $heading !!}

@foreach ($lines as $line)
{!! $line !!}

@endforeach
{!! $actionText !!}: {!! $actionUrl !!}

@foreach ($outroLines as $line)
{!! $line !!}

@endforeach
--
@if (config('mail.support_address'))
Need help? Email us at {!! config('mail.support_address') !!}.
@endif
This is an automatic message. Please don't reply to it.
Plan B International Private Limited
