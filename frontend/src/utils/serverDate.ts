/** The backend compares dates with timezone.localdate() in Asia/Bangkok (Django TIME_ZONE),
 *  so "today" for any rule the server enforces is the Bangkok calendar day, whatever time
 *  zone the browser is in. Returns yyyy-mm-dd. */
export function serverToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(now);
}
