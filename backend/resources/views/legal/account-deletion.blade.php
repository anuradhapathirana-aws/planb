{{--
    Public "Delete account URL" for the Google Play Console Data safety form.

    Google requires this page to: name the app and developer as they appear on
    the store listing, give the steps to request deletion, and say what is
    deleted, what is kept and for how long. It must also work for someone who has
    already uninstalled the app, which is why it offers an email route as well
    as the in-app one.

    Must match what StudentAccountService actually does. Change one, change both.
--}}
@php
    $appName = config('legal.app_name');
    $companyName = config('legal.company_name');
    $supportAddress = config('legal.support_address');
    $retentionYears = config('legal.payment_record_retention_years');
    $requestDays = config('legal.deletion_request_days');
@endphp

@extends('legal.layout', ['title' => 'Delete your account'])

@section('description', "How to delete your {$appName} account and the data linked to it.")

@section('content')
    <section class="card">
        <h1>Delete your {{ $appName }} account</h1>
        <p class="lead">
            {{ $appName }} is published by {{ $companyName }}. You can delete your account and the
            personal data linked to it at any time, in the app or by email.
        </p>
        <p class="notice">
            Deleting your account is permanent. You will lose your course progress and results, and
            it cannot be undone. Courses you paid for cannot be restored to a new account.
        </p>
    </section>

    <section class="card">
        <span class="step-label">Option 1 · Fastest</span>
        <h2>Delete it in the app</h2>
        <ol>
            <li>Open the <strong>{{ $appName }}</strong> app and sign in.</li>
            <li>Go to the <strong>Profile</strong> tab.</li>
            <li>Tap <strong>Delete account</strong> at the bottom of the page.</li>
            <li>Tap <strong>Email me a code</strong>. We send a 6-digit code to the email address on your account.</li>
            <li>Enter the code and tap <strong>Delete my account</strong>.</li>
        </ol>
        <p class="muted">Your account is deleted straight away, and you are signed out on every device.</p>
    </section>

    <section class="card">
        <span class="step-label">Option 2 · No app</span>
        <h2>Ask us by email</h2>
        <p>If you no longer have the app, email us <strong>from the email address on your account</strong>:</p>

        @if ($supportAddress)
            <a class="email-box" href="mailto:{{ $supportAddress }}?subject={{ rawurlencode('Delete my '.$appName.' account') }}">{{ $supportAddress }}</a>
        @else
            <p class="email-box">Plan B support email (coming soon)</p>
        @endif

        <ul>
            <li>Use the subject <strong>"Delete my account"</strong>.</li>
            <li>Include your full name and, if you know it, your Student ID (it starts with PB-).</li>
        </ul>
        <p>
            To protect your account, we only act on requests sent from the email address on the account.
            We will reply to confirm, and delete the account within {{ $requestDays }} days.
        </p>
    </section>

    <div class="columns">
        <section class="card">
            <h2>What we delete</h2>
            <ul>
                <li>Your name, email address, phone number, address and date of birth</li>
                <li>Your visa status, qualification, industry, profession, languages and bio</li>
                <li>Your profile photo, CV and profile video</li>
                <li>Your lesson progress and assessment results</li>
                <li>Your checklist progress and course wishlist</li>
                <li>Your sign-in sessions on all devices</li>
            </ul>
        </section>

        <section class="card">
            <h2>What we keep, and for how long</h2>
            <p>
                <strong>Records of courses and services you paid for</strong>, including any bank transfer
                slips and reference numbers you uploaded, and your Plan B Student ID.
            </p>
            <p>
                We must keep these for accounting and tax purposes. They are kept for
                <strong>{{ $retentionYears }} years</strong> after the payment and then deleted. They are
                not used for anything else.
            </p>
        </section>
    </div>

    <section class="card">
        <h2>Delete only some of your data</h2>
        <p>
            You don't have to delete your whole account. In the app, go to <strong>Profile</strong> and tap the
            edit button to remove your profile photo or clear optional details. For anything else,
            @if ($supportAddress)
                email <a href="mailto:{{ $supportAddress }}">{{ $supportAddress }}</a>.
            @else
                contact Plan B support.
            @endif
        </p>
    </section>
@endsection
