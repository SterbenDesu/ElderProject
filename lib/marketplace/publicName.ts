// Privacy-safe public display name.
//
// Caregiver cards and pins must never reveal a full last name. `display_name`
// is the caregiver's chosen public name, but to guarantee the "first name +
// last initial" privacy rule on every surface we normalise it here: keep the
// first word in full and reduce every following word to an initial.
//   "Maria Koleva"      -> "Maria K."
//   "Maria K."          -> "Maria K."   (already safe)
//   "Ivan Petrov Dimov" -> "Ivan P. D."
export function toPublicDisplayName(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return parts[0] ?? displayName.trim();
  }
  const [first, ...rest] = parts;
  const initials = rest
    .map((word) => {
      const letter = word.replace(/[.\s]/g, "").charAt(0);
      return letter ? `${letter.toUpperCase()}.` : "";
    })
    .filter(Boolean)
    .join(" ");
  return initials ? `${first} ${initials}` : first;
}
