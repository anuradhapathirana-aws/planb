<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * What an emailed one-time code may be used for.
 *
 * A code only ever works for the purpose it was issued for, so a deletion code
 * cannot sign anyone in and a sign-in code cannot delete an account.
 */
enum LoginCodePurpose: string
{
    case SignIn = 'sign_in';

    /** Confirms that the account holder, not just whoever holds the phone, wants it gone. */
    case DeleteAccount = 'delete_account';
}
