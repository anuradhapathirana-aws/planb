<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Bunny Stream
    |--------------------------------------------------------------------------
    |
    | Lesson video hosting. When this is disabled every video path falls back to
    | the private `course_videos` disk and the signed `course-videos.playback`
    | route, which is what local development and the test suite run on — there
    | are no Bunny credentials on a developer machine and tests must never make
    | a network call.
    |
    | Enabling it changes three things and nothing else: where an admin's browser
    | uploads to, what `CourseVideoService::playbackUrl()` returns, and who serves
    | the bytes. Enrolment checks, the no-skip rule and progress tracking are
    | untouched — they never saw the file in the first place.
    |
    */

    'enabled' => (bool) env('BUNNY_STREAM_ENABLED', false),

    /*
    | Video library id and API key, from Stream → your library → API in the Bunny
    | dashboard. The API key is a master credential for the whole library: it can
    | delete every video. It stays server-side, always. The browser is handed a
    | per-video upload signature instead (see `BunnyStreamClient::uploadTicket()`).
    */

    'library_id' => env('BUNNY_STREAM_LIBRARY_ID'),

    'api_key' => env('BUNNY_STREAM_API_KEY'),

    /*
    | The library's CDN hostname, e.g. `vz-1a2b3c4d-e5f.b-cdn.net`. Shown in the
    | library as the "CDN Hostname". No scheme, no trailing slash.
    */

    'cdn_hostname' => env('BUNNY_STREAM_CDN_HOSTNAME'),

    /*
    | Token authentication key for the library's pull zone (Stream → library →
    | API → Pull Zone → Manage → Security → Token Authentication). NOT the
    | library's embed-view token key — that one signs Bunny's own iframe
    | player, which we don't use, and every playback would 403. This is what
    | signs playback URLs. Token authentication must also be switched ON in the
    | dashboard — otherwise every video is world-readable to anyone who learns a
    | guid, and the signing below becomes decoration.
    */

    'token_key' => env('BUNNY_STREAM_TOKEN_KEY'),

    /*
    | The library's Read-Only API key (Stream → library → API). Bunny signs every
    | webhook with it (HMAC-SHA256 of the raw body). When set, an unsigned or
    | mis-signed webhook is ignored. When blank the webhook is still safe — it is
    | only ever a nudge to re-read status with our own key — but anyone could
    | make us spend Bunny API calls, so fill it in production.
    */

    'webhook_key' => env('BUNNY_STREAM_WEBHOOK_KEY'),

    /*
    | Resolutions Bunny is asked to encode. Each one is stored and billed, so
    | this list is the main lever on storage cost. 240p/360p exist for students
    | on weak mobile data — the whole point of adaptive streaming is that they
    | get a lower rung instead of buffering on 720p.
    */

    'resolutions' => env('BUNNY_STREAM_RESOLUTIONS', '240p,360p,480p,720p'),

    /*
    | How long a browser upload signature stays valid. Long enough for a large
    | lesson on a slow connection; it authorizes one video id and nothing else.
    */

    'upload_ticket_minutes' => (int) env('BUNNY_STREAM_UPLOAD_TICKET_MINUTES', 240),

    /*
    | TUS endpoint for resumable uploads. Fixed by Bunny; here so tests can point
    | it somewhere harmless.
    */

    'tus_endpoint' => env('BUNNY_STREAM_TUS_ENDPOINT', 'https://video.bunnycdn.com/tusupload'),

    'api_base_url' => env('BUNNY_STREAM_API_BASE_URL', 'https://video.bunnycdn.com'),

];
