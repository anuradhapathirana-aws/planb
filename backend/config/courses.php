<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Course video uploads
    |--------------------------------------------------------------------------
    |
    | Largest lesson file an admin may upload, in megabytes. PHP itself must
    | allow at least this much as well — `upload_max_filesize`, `post_max_size`
    | and `max_execution_time` in php.ini all cap the request before Laravel
    | ever sees it, so raise those alongside this value.
    |
    */

    'max_video_upload_mb' => (int) env('COURSE_MAX_VIDEO_UPLOAD_MB', 512),

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
