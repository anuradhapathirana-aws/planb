<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * How the student app's intro animates the logo and greeting.
 *
 * A fixed set of presets the app already knows how to draw, rather than an
 * uploaded animation file — no extra native package, no heavy download before
 * the very first screen.
 */
enum IntroAnimation: string
{
    case Fade = 'fade';
    case Zoom = 'zoom';
    case SlideUp = 'slide_up';
    case Pulse = 'pulse';

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $animation) => $animation->value, self::cases());
    }
}
