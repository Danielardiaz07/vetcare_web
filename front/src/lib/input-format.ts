export function applyInputFormat(
  input: HTMLInputElement,
  formatted: string,
  separator: string,
  inputType: string,
) {
  const original = input.value;
  if (original === formatted) return;

  const caret = input.selectionStart ?? original.length;
  const count = original.slice(0, caret).replaceAll(separator, "").length;
  let cursor = 0;
  let seen = 0;
  while (cursor < formatted.length && seen < count) {
    if (formatted[cursor] !== separator) seen++;
    cursor++;
  }
  if (caret === original.length) cursor = formatted.length;
  if (inputType === "deleteContentForward" && formatted[cursor] === separator) cursor++;

  input.value = formatted;
  input.setSelectionRange(cursor, cursor);
}
