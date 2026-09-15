{{--
    An email whose point is one button, e.g. unlocking an admin account.

    Expects: $heading, $lines (string[] before the button), $actionText,
    $actionUrl, $outroLines (string[] after it), $preheader.

    The raw link is repeated under the button: some mail apps block buttons,
    and an admin who can't click must still be able to copy it.
--}}
@extends('emails.layout')

@section('content')
    <h1 style="margin:0 0 12px; font-family:Arial, Helvetica, sans-serif; font-size:22px; line-height:30px; font-weight:bold; color:#14224b;">
        {{ $heading }}
    </h1>

    @foreach ($lines as $line)
        <p style="margin:0 0 14px;">{{ $line }}</p>
    @endforeach

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 20px;">
        <tr>
            <td align="center" style="background-color:#14224b; border-radius:8px;">
                <a href="{{ $actionUrl }}" style="display:inline-block; padding:12px 26px; font-family:Arial, Helvetica, sans-serif; font-size:15px; font-weight:bold; color:#ffffff; text-decoration:none;">{{ $actionText }}</a>
            </td>
        </tr>
    </table>

    @foreach ($outroLines as $line)
        <p style="margin:0 0 14px; color:#334155;">{{ $line }}</p>
    @endforeach

    <p style="margin:20px 0 0; font-size:12px; line-height:18px; color:#64748b; word-break:break-all;">
        If the button doesn't work, copy this link into your browser:<br>
        <a href="{{ $actionUrl }}" style="color:#14224b;">{{ $actionUrl }}</a>
    </p>
@endsection
