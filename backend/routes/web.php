<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

/*
 * Public legal pages. No login, no session data, nothing personal: Google Play
 * links to these from the store listing, so anyone must be able to open them.
 */
Route::view('/account-deletion', 'legal.account-deletion')->name('legal.account-deletion');
Route::view('/privacy', 'legal.privacy')->name('legal.privacy');
Route::view('/terms', 'legal.terms')->name('legal.terms');
