<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Public legal pages
    |--------------------------------------------------------------------------
    |
    | Values shown on the public pages Google Play links to (account deletion,
    | and later privacy policy and terms). Kept in one file so the pages, the
    | privacy policy and the Play Console forms can never disagree.
    |
    */

    // The legal entity that publishes the app.
    'company_name' => env('LEGAL_COMPANY_NAME', 'Plan B International Private Limited'),

    // The name students see on Google Play and on their phone.
    'app_name' => env('LEGAL_APP_NAME', 'Plan B Academy'),

    /*
     * Where students write for help or to ask for deletion without the app.
     * The same inbox as the email footer, so there is one address to change.
     */
    'support_address' => env('MAIL_SUPPORT_ADDRESS'),

    /*
     * How long payment records and bank slips are kept after an account is
     * deleted, for accounting and tax. Decided 2026-09-16; confirm with Plan B's
     * accountant before launch.
     */
    'payment_record_retention_years' => (int) env('LEGAL_PAYMENT_RETENTION_YEARS', 7),

    // The longest a deletion requested by email may take.
    'deletion_request_days' => (int) env('LEGAL_DELETION_REQUEST_DAYS', 30),

];
