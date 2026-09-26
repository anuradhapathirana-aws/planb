{{--
    A short informational email with no code and no button, e.g. "you already
    have an account".

    Expects: $heading, $lines (string[]), $footnote (?string), $preheader.
--}}
@extends('emails.layout')

@section('content')
    <h1 style="margin:0 0 12px; font-family:Arial, Helvetica, sans-serif; font-size:22px; line-height:30px; font-weight:bold; color:#14224b;">
        {{ $heading }}
    </h1>

    @foreach ($lines as $line)
        <p style="margin:0 0 14px;">{{ $line }}</p>
    @endforeach

    @if ($footnote)
        <p style="margin:16px 0 0; font-size:13px; line-height:20px; color:#64748b;">
            {{ $footnote }}
        </p>
    @endif
@endsection
