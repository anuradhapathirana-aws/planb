{{--
    A one-time code email: sign-in, or confirming an account deletion.

    Expects: $heading, $intro, $code, $ttlMinutes, $warning, $preheader.
    The code sits alone in a large monospaced box so it can be read at a glance
    and copied without dragging the surrounding sentence along.
--}}
@extends('emails.layout')

@section('content')
    <h1 style="margin:0 0 12px; font-family:Arial, Helvetica, sans-serif; font-size:22px; line-height:30px; font-weight:bold; color:#14224b;">
        {{ $heading }}
    </h1>

    <p style="margin:0 0 20px;">{{ $intro }}</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td align="center" style="background-color:#f1f5f9; border:1px solid #e2e8f0; border-radius:10px; padding:18px 12px;">
                <span style="font-family:'Courier New', Courier, monospace; font-size:34px; line-height:40px; font-weight:bold; letter-spacing:8px; color:#14224b;">{{ $code }}</span>
            </td>
        </tr>
    </table>

    <p style="margin:20px 0 0; color:#334155;">
        This code expires in {{ $ttlMinutes }} minutes and can only be used once.
    </p>

    <p style="margin:16px 0 0; font-size:13px; line-height:20px; color:#64748b;">
        {{ $warning }}
    </p>

    <p style="margin:16px 0 0; font-size:13px; line-height:20px; color:#64748b;">
        Plan B will never ask you for this code by phone, WhatsApp or email.
    </p>
@endsection
