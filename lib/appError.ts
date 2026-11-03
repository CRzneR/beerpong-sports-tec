/*
 * Fehler, deren Text der Nutzer sieht. Statt eines festen deutschen Satzes
 * tragen sie nur einen Code; die Oberfläche übersetzt ihn über den
 * Namensraum "Errors" (messages/de.json, messages/en.json).
 */
export class AppError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "AppError";
    this.code = code;
  }
}
