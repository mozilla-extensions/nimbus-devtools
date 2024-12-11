/**
* Sanitizes a JSON string:
* 1. replace invalid quote characters with valid double quotes.
*
* @param input - The raw JSON string potentially containing invalid quote characters.
* @returns A sanitized JSON string with all quotes converted to valid double quotes.
*/
export function sanitizeJsonInput(input: string): string {
  return input.replace(/[“”‘’]/g, '"');
};
