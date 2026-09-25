<?php

declare(strict_types=1);

use App\Http\Controllers\Public\CourseController;
use App\Http\Controllers\Public\SiteContentController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public API
|--------------------------------------------------------------------------
|
| Registered in bootstrap/app.php under the `api/v1/public` prefix. Its own
| file, beside routes/api.php and routes/api_student.php, for the same reason
| those two are apart on disk: this is the ONLY group in the application with
| no authenticated actor at all, and mixing it into either of the others makes
| it easy to add an authenticated route here — or a public one there — by
| accident.
|
| Three rules for anything added to this file:
|
| 1. **Its own Resource, in app/Http/Resources/Public/.** Never an admin or
|    student one. A Resource written for a signed-in student carries progress,
|    enrolment and lock state; one written for an admin carries the company's
|    bank account. Reusing either is how a stranger ends up with both.
| 2. **No PII, ever.** "500+ learners" is a number. A name, a face or a count
|    small enough to identify somebody is not.
| 3. **Rate limited by IP.** Assume every caller is automated.
|
| `SetLocaleFromRequest` is on this group, like the student group: a visitor
| reading the site in Sinhala gets the Sinhala columns, chosen by the server.
| The admin panel stays English-only and is deliberately not given it.
|
*/

/*
 * The home page's admin-managed content: hero slides, the About video, the
 * team. One request rather than three — all three sit at or near the fold of
 * the same page, and three round trips would be three chances to be slow.
 *
 * The limit is generous because this is the front page: a household or an
 * office behind one NAT address is a single IP, and a visitor who reloads
 * must not be locked out of the company website. It is still low enough that
 * scraping it in a loop is pointless — the payload never changes between calls.
 */
Route::get('/site-content', SiteContentController::class)
    ->name('site-content')
    ->middleware('throttle:public-site');

/*
 * The course catalogue. Paginated and filterable from the start: the home
 * page's "Our Programmes" carousel asks for one large page, and the `/courses`
 * catalogue page will ask for the same endpoint with a search term and a
 * category. A separate "featured courses" endpoint would have had to be thrown
 * away the moment the second screen needed the same rows.
 *
 * `per_page` is capped in both the Form Request and the Service — an unbounded
 * page size on an open endpoint is a free way to make the server assemble the
 * whole catalogue on demand.
 */
Route::get('/courses', [CourseController::class, 'index'])
    ->name('courses.index')
    ->middleware('throttle:public-site');

/*
 * One course's page. **The parameter is `{id}`, and must never be renamed to
 * `{course}`**: `Route::bind('course', …)` in routes/api_student.php is GLOBAL,
 * so a `{course}` here would be resolved by the student binder — which checks
 * "published" but not the visitor's stricter category rule — before this
 * controller ever ran. The Service's query is the scope. `whereNumber` keeps
 * anything else from reaching the controller at all.
 */
Route::get('/courses/{id}', [CourseController::class, 'show'])
    ->whereNumber('id')
    ->name('courses.show')
    ->middleware('throttle:public-site');

/*
 * The `/courses` page's category filter. Not the student app's
 * `course-categories`: that one lists empty categories on purpose (Home's row)
 * and sits behind a session. This one lists only categories a visitor would
 * find a course in, with the count.
 */
Route::get('/course-categories', [CourseController::class, 'categories'])
    ->name('course-categories.index')
    ->middleware('throttle:public-site');

/*
 * One category's page — a course bundle's, on the website (`/bundles/:id`).
 * `{id}`, not `{category}`, for the same reason as the course route above:
 * never let a route name collide with a global binder.
 */
Route::get('/course-categories/{id}', [CourseController::class, 'category'])
    ->whereNumber('id')
    ->name('course-categories.show')
    ->middleware('throttle:public-site');
