{{--
    Privacy policy — linked from the Google Play listing, the Data safety form,
    the app's Profile tab and its sign-in screen.

    DRAFT FOR CLIENT APPROVAL (2026-09-16). It describes what the code actually
    does today; keep it that way:
    - A new kind of data, a new third party (e.g. Sentry, P3-11), or switching
      payments on means updating this page, `policies_updated_at` in
      config/legal.php, and the Play Console Data safety form together.
    - Deletion wording must match StudentAccountService and account-deletion.blade.php.
--}}
@php
    $appName = config('legal.app_name');
    $companyName = config('legal.company_name');
    $companyAddress = config('legal.company_address');
    $registrationNumber = config('legal.company_registration_number');
    $supportAddress = config('legal.support_address');
    $retentionYears = config('legal.payment_record_retention_years');
    $updatedAt = \Illuminate\Support\Carbon::parse(config('legal.policies_updated_at'))->format('j F Y');
@endphp

@extends('legal.layout', ['title' => 'Privacy Policy'])

@section('description', "How {$companyName} collects, uses and protects your personal data in the {$appName} app.")

@section('content')
    <section class="card">
        <h1>Privacy Policy</h1>
        <p class="muted">Last updated: {{ $updatedAt }}</p>
        <p class="lead">
            This policy explains what personal data the {{ $appName }} app collects, why we need it, who we
            share it with, and the choices you have. We have written it in plain language. If anything is
            unclear, please contact us.
        </p>
    </section>

    <section class="card">
        <h2>1. Who we are</h2>
        <p>
            {{ $appName }} is run by <strong>{{ $companyName }}</strong> ("Plan B", "we", "us"), a company in
            Sri Lanka that prepares students for education and work in the United Arab Emirates. We are
            responsible for your personal data under Sri Lanka's Personal Data Protection Act, No. 9 of 2022.
        </p>
        @if ($companyAddress || $registrationNumber)
            <p>
                @if ($companyAddress)
                    Registered address: {{ $companyAddress }}<br>
                @endif
                @if ($registrationNumber)
                    Company registration number: {{ $registrationNumber }}
                @endif
            </p>
        @endif
    </section>

    <section class="card">
        <h2>2. The data we collect</h2>
        <p><strong>Account details</strong></p>
        <ul>
            <li>Your email address, which you use to sign in.</li>
            <li>If you sign in with Google: your Google account ID, name and email address, as shared by Google.</li>
            <li>Your Plan B Student ID.</li>
        </ul>
        <p><strong>Profile details you give us</strong></p>
        <ul>
            <li>Full name, date of birth, phone number and address.</li>
            <li>Visa status, highest qualification, industry, profession, languages and a short bio.</li>
            <li>Your profile photo, and a CV or profile video if one is added to your account.</li>
        </ul>
        <p><strong>Your learning activity</strong></p>
        <ul>
            <li>Which lessons you have watched and how far, your assessment answers and results.</li>
            <li>Your checklist progress and saved courses (wishlist).</li>
            <li>What you type in search, used only to show results and not saved.</li>
            <li>The courses and services you enrol in or buy.</li>
        </ul>
        <p><strong>Payment details</strong></p>
        <ul>
            <li>
                Orders and payments for courses and services, and any bank transfer slip and reference number
                you upload. We never see or store your card number: card payments happen on the payment
                provider's own secure page.
            </li>
        </ul>
        <p><strong>Technical details</strong></p>
        <ul>
            <li>
                Your phone's model name (to label your signed-in devices), and the internet (IP) address used
                when you ask for a sign-in code, to stop abuse.
            </li>
        </ul>
        <p>
            We do not use advertising, we do not track you across other apps or websites, and we do not access
            your contacts, location or microphone.
        </p>
    </section>

    <section class="card">
        <h2>3. How we use your data</h2>
        <ul>
            <li>To create your account, sign you in, and keep your account secure.</li>
            <li>To give you your courses, track your progress and grade your assessments.</li>
            <li>To provide the services you buy, such as CV writing or visa guidance, and to help you prepare for work in the UAE.</li>
            <li>To process and check payments, and to keep the financial records the law requires.</li>
            <li>To send you emails you need, such as sign-in codes and account messages.</li>
            <li>To answer your questions and give you support.</li>
        </ul>
        <p>
            We use your data because you asked us to provide these services (our agreement with you), because
            the law requires it (for example, financial records), or with your consent where we ask for it.
        </p>
    </section>

    <section class="card">
        <h2>4. Who we share your data with</h2>
        <p><strong>Employers and recruitment agencies — only with your agreement.</strong></p>
        <p>
            To help you find work, we may share your name, contact details, qualifications, CV and profile video
            with employers or recruitment agencies in the UAE, for a job or opportunity you have agreed to be put
            forward for. We will not share them without your agreement, and you can change your mind at any time
            by contacting us.
        </p>
        <p><strong>Companies that help us run the app.</strong> They only use your data to do this work for us:</p>
        <ul>
            <li>Our hosting provider, which stores the app's data on secure servers.</li>
            <li>Our email provider, which sends sign-in codes and account emails.</li>
            <li>Google, if you choose to sign in with Google.</li>
            <li>Our payment provider, when you pay by card.</li>
        </ul>
        <p>
            <strong>When the law requires it</strong>, we may share data with courts, police or government
            authorities.
        </p>
        <p>We never sell your personal data.</p>
    </section>

    <section class="card">
        <h2>5. Where your data is stored</h2>
        <p>
            Your data may be stored and processed outside Sri Lanka, including on servers in India, and shared
            with employers in the UAE as described above. When we do this we take steps to keep it protected to
            the standard this policy describes.
        </p>
    </section>

    <section class="card">
        <h2>6. How we protect your data</h2>
        <ul>
            <li>All data sent between the app and our servers is encrypted (HTTPS).</li>
            <li>Your sign-in session is stored in your phone's secure storage, and sign-in codes are stored scrambled (hashed) so they cannot be read.</li>
            <li>CVs, profile videos and course videos are only available through short-lived private links.</li>
            <li>Only Plan B staff who need your data for their job can see it.</li>
        </ul>
        <p>No system is perfectly secure, but we work hard to protect your data and fix problems quickly.</p>
    </section>

    <section class="card">
        <h2>7. How long we keep your data</h2>
        <ul>
            <li>Your account and profile: until you delete your account.</li>
            <li>Sign-in codes: 10 minutes, and each can be used once.</li>
            <li>
                Payment records and bank slips: <strong>{{ $retentionYears }} years</strong> after the payment, for
                accounting and tax, even if you delete your account.
            </li>
        </ul>
    </section>

    <section class="card">
        <h2>8. Your rights and choices</h2>
        <p>You have the right to:</p>
        <ul>
            <li>see the personal data we hold about you, and get a copy;</li>
            <li>correct data that is wrong — most details can be changed in the app under <strong>Profile</strong>;</li>
            <li>withdraw your agreement to share your data with employers;</li>
            <li>delete your account and your data.</li>
        </ul>
        <p>
            You can delete your account yourself in the app (Profile &rarr; Delete account), or read
            <a href="{{ route('legal.account-deletion') }}">how to delete your account</a> if you no longer have
            the app. For anything else,
            @if ($supportAddress)
                email <a href="mailto:{{ $supportAddress }}">{{ $supportAddress }}</a>.
            @else
                contact Plan B support.
            @endif
            If you are not happy with how we handle your data, you can also complain to Sri Lanka's Data
            Protection Authority.
        </p>
    </section>

    <section class="card">
        <h2>9. Age</h2>
        <p>
            {{ $appName }} is for people aged <strong>18 or older</strong>. We do not knowingly collect data from
            anyone younger. If you think someone under 18 has an account, please contact us and we will delete it.
        </p>
    </section>

    <section class="card">
        <h2>10. Changes to this policy</h2>
        <p>
            We may update this policy. When we make an important change, we will tell you in the app or by email
            before it applies. The date at the top shows when it last changed.
        </p>
    </section>

    <section class="card">
        <h2>11. Contact us</h2>
        <p>
            {{ $companyName }}<br>
            @if ($companyAddress)
                {{ $companyAddress }}<br>
            @endif
            @if ($supportAddress)
                Email: <a href="mailto:{{ $supportAddress }}">{{ $supportAddress }}</a>
            @else
                Email: Plan B support (coming soon)
            @endif
        </p>
        <p class="muted">See also our <a href="{{ route('legal.terms') }}">Terms of Use</a>.</p>
    </section>
@endsection
