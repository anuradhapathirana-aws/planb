{{--
    Shell for Plan B's public legal pages: account deletion now, privacy policy
    and terms next (P1-4).

    Self-contained on purpose — plain CSS in the page, no Vite build and no
    JavaScript — so the pages work on any server the API runs on, load fast on a
    slow phone connection, and can't break when a frontend build changes.
    Colours are the brand tokens (shared/src/theme/tokens.json): navy #14224b,
    gold #c79a3a used only for rules and accents, never for text.

    Expects: $title, a `content` section, optional `description` section.
--}}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>{{ $title }} · {{ config('legal.app_name') }}</title>
    <meta name="description" content="@yield('description')">
    <link rel="icon" href="{{ asset('favicon.ico') }}">
    <style>
        *, *::before, *::after { box-sizing: border-box; }

        body {
            margin: 0;
            background: #f1f5f9;
            color: #0f172a;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Sinhala', Arial, sans-serif;
            font-size: 16px;
            line-height: 1.65;
            -webkit-text-size-adjust: 100%;
        }

        .header {
            background: #14224b;
            border-bottom: 3px solid #c79a3a;
            padding: 20px 16px;
        }

        .header-inner {
            max-width: 760px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .header img {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: #ffffff;
            flex-shrink: 0;
        }

        .brand {
            color: #ffffff;
            font-weight: 700;
            font-size: 18px;
            letter-spacing: 0.5px;
            line-height: 1.2;
        }

        .brand small {
            display: block;
            color: #cbd5e1;
            font-weight: 400;
            font-size: 13px;
            letter-spacing: 0;
        }

        main {
            max-width: 760px;
            margin: 0 auto;
            padding: 24px 16px 48px;
        }

        .card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 24px 20px;
        }

        .card + .card { margin-top: 16px; }

        h1 {
            margin: 0 0 8px;
            color: #14224b;
            font-size: 26px;
            line-height: 1.3;
        }

        h2 {
            margin: 0 0 12px;
            color: #14224b;
            font-size: 19px;
            line-height: 1.35;
        }

        p { margin: 0 0 12px; }
        p:last-child { margin-bottom: 0; }

        .lead { color: #334155; font-size: 17px; }
        .muted { color: #64748b; font-size: 14px; }

        ol, ul { margin: 0 0 12px; padding-left: 22px; }
        li { margin-bottom: 6px; }
        li:last-child { margin-bottom: 0; }

        a { color: #14224b; text-decoration: underline; text-underline-offset: 2px; }
        a:focus-visible { outline: 3px solid #c79a3a; outline-offset: 2px; border-radius: 2px; }

        .step-label {
            display: inline-block;
            margin-bottom: 8px;
            padding: 2px 10px;
            border-radius: 999px;
            background: #eef2ff;
            color: #14224b;
            font-size: 13px;
            font-weight: 700;
        }

        .notice {
            border-left: 4px solid #dc2626;
            background: #fef2f2;
            color: #7f1d1d;
            padding: 12px 14px;
            border-radius: 6px;
            margin: 0 0 16px;
        }

        .email-box {
            display: block;
            margin: 12px 0;
            padding: 12px 14px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-weight: 700;
            word-break: break-all;
        }

        .columns { display: grid; gap: 16px; }

        @media (min-width: 640px) {
            .card { padding: 28px; }
            h1 { font-size: 30px; }
            .columns { grid-template-columns: 1fr 1fr; }
        }

        footer {
            max-width: 760px;
            margin: 0 auto;
            padding: 0 16px 32px;
            color: #64748b;
            font-size: 13px;
            line-height: 2;
        }

        footer a { color: #475569; }
    </style>
</head>
<body>
    <header class="header">
        <div class="header-inner">
            <img src="{{ asset('images/planb-logo.png') }}" alt="" width="48" height="48">
            <div class="brand">
                {{ config('legal.app_name') }}
                <small>{{ config('legal.company_name') }}</small>
            </div>
        </div>
    </header>

    <main>
        @yield('content')
    </main>

    <footer>
        <a href="{{ route('legal.privacy') }}">Privacy Policy</a> ·
        <a href="{{ route('legal.terms') }}">Terms of Use</a> ·
        <a href="{{ route('legal.account-deletion') }}">Delete your account</a><br>
        &copy; {{ now()->year }} {{ config('legal.company_name') }}
    </footer>
</body>
</html>
