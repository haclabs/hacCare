/** The UI prepends "Dr." itself when displaying a name — strip any "Dr"/"Dr." the user typed to avoid "Dr. Dr. Smith" */
export function stripDoctorTitle(name: string): string {
  return name.trim().replace(/^dr\.?\s*/i, '');
}
