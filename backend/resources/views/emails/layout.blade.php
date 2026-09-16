{{--
    The branded shell for every Plan B email.

    Built the way email has to be, not the way the web is: table layout and
    inline styles, because Gmail and Outlook strip <style> blocks, flexbox and
    most CSS. Brand colours are hardcoded for the same reason — there is no
    Tailwind in an inbox. Navy #14224b is the brand; gold #c79a3a is used only
    as a thin rule, never for text (it fails contrast on white).

    The logo is embedded as an inline attachment (CID) rather than linked. A
    linked image needs a public HTTPS URL, and most mail apps hide remote images
    until the reader allows them — an embedded one shows straight away and works
    from a local server too. `$message` only exists when the mail is actually
    being sent; a preview (`->render()`) falls back to the text wordmark.

    Expects: $preheader (string), and a `content` section.
--}}
@php
    $logoPath = resource_path('images/email-logo.png');
    $logoSrc = isset($message) && is_file($logoPath) ? $message->embed($logoPath) : null;
    $supportAddress = config('mail.support_address');
    $companyName = 'Plan B International Private Limited';
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="color-scheme" content="light only">
    <title>{{ config('app.name') }}</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; -webkit-text-size-adjust:100%;">
    {{-- Inbox preview text. Hidden in the body; never contains the code itself. --}}
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">
        {{ $preheader ?? '' }}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;">
        <tr>
            <td align="center" style="padding:24px 12px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

                    {{-- Header --}}
                    <tr>
                        <td align="center" style="background-color:#14224b; border-radius:12px 12px 0 0; padding:24px 24px 20px;">
                            @if ($logoSrc)
                                <img src="{{ $logoSrc }}" width="72" height="72" alt="Plan B Academy" style="display:block; width:72px; height:72px; border:0; border-radius:36px;">
                            @endif
                            <div style="margin-top:{{ $logoSrc ? '10px' : '0' }}; font-family:Arial, Helvetica, sans-serif; font-size:18px; font-weight:bold; letter-spacing:1px; color:#ffffff;">
                                PLAN B ACADEMY
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color:#c79a3a; height:3px; line-height:3px; font-size:0;">&nbsp;</td>
                    </tr>

                    {{-- Body --}}
                    <tr>
                        <td style="background-color:#ffffff; padding:32px 28px; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:24px; color:#0f172a;">
                            @yield('content')
                        </td>
                    </tr>

                    {{-- Footer --}}
                    <tr>
                        <td style="background-color:#ffffff; border-top:1px solid #e2e8f0; border-radius:0 0 12px 12px; padding:18px 28px 22px; font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:18px; color:#64748b;">
                            @if ($supportAddress)
                                Need help? Email us at
                                <a href="mailto:{{ $supportAddress }}" style="color:#14224b; text-decoration:underline;">{{ $supportAddress }}</a>.<br>
                            @endif
                            This is an automatic message. Please don't reply to it.<br>
                            &copy; {{ now()->year }} {{ $companyName }}
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
