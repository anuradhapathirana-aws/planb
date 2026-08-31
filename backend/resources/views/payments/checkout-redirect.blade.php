<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    {{--
        Nothing on this page may be indexed, cached or referred onward: the form
        carries a payment hash, and the Referer header would leak this signed URL
        to the gateway's own logs.
    --}}
    <meta name="robots" content="noindex, nofollow">
    <meta name="referrer" content="no-referrer">
    <title>Redirecting to secure payment</title>
    <style>
        body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8fafc;
            color: #0f172a;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            text-align: center;
            padding: 24px;
        }
        .spinner {
            width: 32px;
            height: 32px;
            margin: 0 auto 20px;
            border: 3px solid #e2e8f0;
            border-top-color: #14224b;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        h1 { font-size: 17px; font-weight: 600; margin: 0 0 8px; }
        p { font-size: 14px; line-height: 1.6; color: #64748b; margin: 0; }
        button {
            margin-top: 24px;
            min-height: 44px;
            padding: 12px 24px;
            font: inherit;
            font-weight: 600;
            color: #ffffff;
            background: #14224b;
            border: 0;
            border-radius: 8px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <main>
        <div class="spinner" aria-hidden="true"></div>
        <h1>Taking you to secure payment</h1>
        <p>Please don't close this window.</p>

        {{--
            Every value is escaped by Blade. The field set comes from the gateway
            driver, but it interpolates order titles and student names, so it is
            treated as untrusted here regardless.
        --}}
        <form id="checkout" method="POST" action="{{ $checkoutUrl }}">
            @foreach ($fields as $name => $value)
                <input type="hidden" name="{{ $name }}" value="{{ $value }}">
            @endforeach

            {{-- Submits itself; the button is the fallback if scripting is off. --}}
            <button type="submit">Continue to payment</button>
        </form>
    </main>

    <script>
        document.getElementById('checkout').submit();
    </script>
</body>
</html>
