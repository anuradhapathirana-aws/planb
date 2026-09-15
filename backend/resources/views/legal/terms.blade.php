{{--
    Terms of use — linked from the app's Profile tab and sign-in screen.

    DRAFT FOR CLIENT APPROVAL (2026-09-16). Decisions it records (user,
    2026-09-16): 18+ only; no refund once a lesson is opened or a service has
    started; Sri Lankan law. The refund rules must match what the app and admin
    panel actually do once payments are switched on.
--}}
@php
    $appName = config('legal.app_name');
    $companyName = config('legal.company_name');
    $supportAddress = config('legal.support_address');
    $updatedAt = \Illuminate\Support\Carbon::parse(config('legal.policies_updated_at'))->format('j F Y');
@endphp

@extends('legal.layout', ['title' => 'Terms of Use'])

@section('description', "The rules for using the {$appName} app.")

@section('content')
    <section class="card">
        <h1>Terms of Use</h1>
        <p class="muted">Last updated: {{ $updatedAt }}</p>
        <p class="lead">
            These terms are the agreement between you and <strong>{{ $companyName }}</strong> ("Plan B", "we",
            "us") for using the {{ $appName }} app. By creating an account or using the app, you agree to them.
            Please read them together with our <a href="{{ route('legal.privacy') }}">Privacy Policy</a>.
        </p>
    </section>

    <section class="card">
        <h2>1. Who can use the app</h2>
        <ul>
            <li>You must be <strong>18 or older</strong>.</li>
            <li>The details you give us must be true and up to date. Your name must match your passport, because we use it for visa and job paperwork.</li>
            <li>One account per person. Don't share your account or let anyone else use it.</li>
        </ul>
    </section>

    <section class="card">
        <h2>2. Your account</h2>
        <ul>
            <li>You sign in with a code sent to your email, or with Google. Keep your email account secure — anyone who can read it could sign in as you.</li>
            <li>Never share a sign-in code. Plan B will never ask you for one.</li>
            <li>Tell us straight away if you think someone else has used your account.</li>
            <li>You can delete your account at any time in the app (Profile &rarr; Delete account).</li>
        </ul>
    </section>

    <section class="card">
        <h2>3. Courses</h2>
        <ul>
            <li>When you enrol in a course, you can watch its lessons for as long as the course is offered in the app.</li>
            <li>Lessons must be watched in full. The app does not let you skip ahead, and an assessment unlocks only when you have watched the lessons it needs.</li>
            <li>Assessments are graded automatically. Your result is based on your own answers.</li>
            <li>We may update, improve or replace course content over time.</li>
        </ul>
    </section>

    <section class="card">
        <h2>4. Services</h2>
        <ul>
            <li>Services such as CV writing or visa guidance are delivered by Plan B staff. Delivery times shown in the app are estimates.</li>
            <li>We may need information or documents from you to deliver a service. Delays in sending them can delay the service.</li>
        </ul>
        <p class="notice">
            Plan B helps you prepare. <strong>We do not guarantee a job, a visa, an interview or any immigration
            result.</strong> Those decisions are made by employers and government authorities, not by Plan B.
        </p>
    </section>

    <section class="card">
        <h2>5. Prices and payment</h2>
        <ul>
            <li>Prices are shown in the app before you pay, in the currency shown. The price you pay is the price shown at checkout.</li>
            <li>Card payments are handled on our payment provider's secure page. We never see your card number.</li>
            <li>Bank transfers are checked by our team before your course or service starts. If a transfer can't be confirmed, we will tell you and you can submit it again.</li>
            <li>Some payment methods may not be available at all times.</li>
        </ul>
    </section>

    <section class="card">
        <h2>6. Refunds</h2>
        <ul>
            <li><strong>Courses:</strong> no refund once you have opened any lesson in the course.</li>
            <li><strong>Services:</strong> no refund once Plan B has started work on the service.</li>
            <li>If you were charged by mistake, or charged twice, contact us and we will put it right.</li>
        </ul>
        <p class="muted">Nothing in these terms takes away any rights you have under Sri Lankan consumer law.</p>
    </section>

    <section class="card">
        <h2>7. Using the app fairly</h2>
        <p>You must not:</p>
        <ul>
            <li>record, download, copy, screenshot or share course videos, assessments or other content;</li>
            <li>share assessment answers, or use tools or other people to take assessments for you;</li>
            <li>try to get around the app's rules, such as skipping lessons, or access content you have not enrolled in;</li>
            <li>try to break into, overload or interfere with the app or other people's accounts;</li>
            <li>upload false documents, or anything illegal, harmful or that belongs to someone else.</li>
        </ul>
    </section>

    <section class="card">
        <h2>8. Our content</h2>
        <p>
            All courses, videos, assessments, text and branding in the app belong to Plan B or the people who
            licensed them to us. We give you a personal, non-transferable right to use them for your own
            learning, for as long as you have access. You may not use them for anything else.
        </p>
    </section>

    <section class="card">
        <h2>9. Suspending or closing accounts</h2>
        <p>
            We may suspend or close an account that breaks these terms, gives false information, or puts other
            users or the app at risk. Where we reasonably can, we will tell you why first. If we close your
            account for breaking these terms, you will not get a refund for courses or services you used.
        </p>
    </section>

    <section class="card">
        <h2>10. Our responsibility</h2>
        <ul>
            <li>We work to keep the app available and correct, but we can't promise it will always be free of errors or interruptions.</li>
            <li>Course content is general guidance to help you prepare. Always check important decisions, such as visa rules, with the official authority.</li>
            <li>As far as the law allows, we are not responsible for losses you could not reasonably expect, or for decisions made by employers, agencies or governments.</li>
            <li>Nothing in these terms limits our responsibility where the law does not allow it to be limited.</li>
        </ul>
    </section>

    <section class="card">
        <h2>11. Changes to these terms</h2>
        <p>
            We may update these terms. When we make an important change, we will tell you in the app or by email
            before it applies. If you keep using the app after that, you accept the new terms. If you don't
            agree, you can delete your account.
        </p>
    </section>

    <section class="card">
        <h2>12. Law</h2>
        <p>
            These terms are governed by the laws of <strong>Sri Lanka</strong>, and the courts of Sri Lanka will
            deal with any dispute. Before going to court, please contact us — most problems can be solved quickly.
        </p>
    </section>

    <section class="card">
        <h2>13. Contact us</h2>
        <p>
            {{ $companyName }}<br>
            @if ($supportAddress)
                Email: <a href="mailto:{{ $supportAddress }}">{{ $supportAddress }}</a>
            @else
                Email: Plan B support (coming soon)
            @endif
        </p>
    </section>
@endsection
