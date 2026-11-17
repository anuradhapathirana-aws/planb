/** Up to two initials from a full name, for an avatar with no photo. */
export function initialsOf(name: string | null | undefined): string {
  return (
    name
      ?.split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') ?? ''
  );
}

/** The first word of a name, or undefined for a blank one so a fallback can fire. */
export function firstNameOf(name: string | null | undefined): string | undefined {
  return name?.trim().split(/\s+/)[0] || undefined;
}
