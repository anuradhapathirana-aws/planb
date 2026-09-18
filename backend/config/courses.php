<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Course uploads
    |--------------------------------------------------------------------------
    |
    | Lesson videos have no size cap — recorded sessions run to several GB.
    | With Bunny Stream they go browser → Bunny over resumable tus and never
    | touch this server. Without Bunny they come through PHP, where php.ini's
    | `upload_max_filesize`, `post_max_size` and `max_execution_time` are the
    | only ceiling.
    |
    */

    'max_thumbnail_upload_mb' => (int) env('COURSE_MAX_THUMBNAIL_UPLOAD_MB', 2),

    /*
    |--------------------------------------------------------------------------
    | Longest accepted lesson duration (seconds)
    |--------------------------------------------------------------------------
    |
    | Sanity bound on the duration the browser reports for an uploaded file.
    | Twelve hours is far beyond any real lesson while still leaving room for
    | recorded sessions.
    |
    */

    'max_video_duration_seconds' => 12 * 60 * 60,

];
