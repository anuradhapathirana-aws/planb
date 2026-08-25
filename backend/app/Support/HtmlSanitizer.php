<?php

declare(strict_types=1);

namespace App\Support;

use DOMDocument;
use DOMElement;
use DOMNode;
use DOMXPath;

/**
 * Allowlist sanitizer for the rich-text fields an admin authors (topic
 * descriptions). Rich text reaches students as HTML, so it can never be stored
 * as received (CLAUDE.md §7.6) — anything outside the allowlist below is
 * unwrapped or dropped, including every script, style, iframe and event handler.
 *
 * Deliberately hand-rolled rather than pulling in a purifier package: the
 * editor emits a small, known tag set, and an allowlist that small is easier to
 * audit than a general-purpose library's configuration.
 */
final class HtmlSanitizer
{
    /** Tags the editor can produce. Anything else is unwrapped (children kept). */
    private const ALLOWED_TAGS = [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li',
        'a', 'h2', 'h3', 'h4', 'blockquote', 'code', 'pre',
    ];

    /** Per-tag attribute allowlist. Every other attribute is stripped. */
    private const ALLOWED_ATTRIBUTES = [
        'a' => ['href', 'target', 'rel'],
    ];

    /** Link schemes that survive. Blocks `javascript:`, `data:` and friends. */
    private const ALLOWED_SCHEMES = ['http', 'https', 'mailto', 'tel'];

    /** Dropped outright, contents and all — unwrapping these would leak code as text. */
    private const STRIPPED_TAGS = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'];

    public static function clean(?string $html): ?string
    {
        if ($html === null) {
            return null;
        }

        $trimmed = trim($html);
        if ($trimmed === '') {
            return null;
        }

        $document = new DOMDocument;

        // Suppresses warnings about HTML5 tags libxml doesn't recognize; malformed
        // markup is recovered rather than rejected, then re-serialized safely.
        $previous = libxml_use_internal_errors(true);
        $loaded = $document->loadHTML(
            '<?xml encoding="UTF-8"?><div id="pb-root">'.$trimmed.'</div>',
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
        );
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        if (! $loaded) {
            return null;
        }

        $root = $document->getElementById('pb-root');
        if (! $root instanceof DOMElement) {
            return null;
        }

        self::removeStrippedTags($document);
        self::sanitizeNode($root);

        $result = '';
        foreach (iterator_to_array($root->childNodes) as $child) {
            $result .= $document->saveHTML($child);
        }

        $result = trim($result);

        // An editor emptied of content still emits "<p></p>" — store null instead
        // so "has a description" checks stay honest. A lone line break still counts
        // as deliberate content, so it isn't nulled out.
        $hasText = trim(html_entity_decode(strip_tags($result), ENT_QUOTES | ENT_HTML5)) !== '';

        return ($hasText || str_contains($result, '<br')) ? $result : null;
    }

    private static function removeStrippedTags(DOMDocument $document): void
    {
        $xpath = new DOMXPath($document);
        $query = implode(' | ', array_map(fn (string $tag) => "//{$tag}", self::STRIPPED_TAGS));

        foreach (iterator_to_array($xpath->query($query) ?: []) as $node) {
            $node->parentNode?->removeChild($node);
        }
    }

    private static function sanitizeNode(DOMNode $node): void
    {
        foreach (iterator_to_array($node->childNodes) as $child) {
            if ($child instanceof DOMElement) {
                self::sanitizeNode($child);
                self::sanitizeElement($child);

                continue;
            }

            // Text nodes are kept (they are escaped on save); comments and
            // processing instructions carry no content worth keeping.
            if (! ($child instanceof \DOMText)) {
                $node->removeChild($child);
            }
        }
    }

    private static function sanitizeElement(DOMElement $element): void
    {
        $tag = strtolower($element->nodeName);

        if (! in_array($tag, self::ALLOWED_TAGS, true)) {
            self::unwrap($element);

            return;
        }

        $allowed = self::ALLOWED_ATTRIBUTES[$tag] ?? [];

        foreach (iterator_to_array($element->attributes ?? []) as $attribute) {
            if (! in_array(strtolower($attribute->nodeName), $allowed, true)) {
                $element->removeAttribute($attribute->nodeName);
            }
        }

        if ($tag === 'a') {
            self::sanitizeLink($element);
        }
    }

    private static function sanitizeLink(DOMElement $element): void
    {
        $href = trim($element->getAttribute('href'));

        if ($href === '' || ! self::hasAllowedScheme($href)) {
            self::unwrap($element);

            return;
        }

        $element->setAttribute('href', $href);

        // Course links open off-platform; noopener/noreferrer keeps the opened
        // page from reaching back into the app through window.opener.
        if ($element->getAttribute('target') === '_blank') {
            $element->setAttribute('rel', 'noopener noreferrer');
        }
    }

    private static function hasAllowedScheme(string $href): bool
    {
        // Relative links (no scheme) stay within the platform and are fine.
        if (! str_contains($href, ':')) {
            return ! str_starts_with($href, '//');
        }

        $scheme = strtolower(strstr($href, ':', true) ?: '');

        return in_array($scheme, self::ALLOWED_SCHEMES, true);
    }

    /** Replaces a disallowed element with its children, so wording survives. */
    private static function unwrap(DOMElement $element): void
    {
        $parent = $element->parentNode;
        if (! $parent instanceof DOMNode) {
            return;
        }

        foreach (iterator_to_array($element->childNodes) as $child) {
            $parent->insertBefore($child, $element);
        }

        $parent->removeChild($element);
    }
}
