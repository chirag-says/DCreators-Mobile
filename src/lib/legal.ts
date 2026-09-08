/**
 * Public-facing legal and support URLs.
 *
 * Play Console asks for the privacy policy and the account-deletion page as
 * public URLs at submission time, and the app has to link to the same pages
 * from inside Settings. Keeping both in one place means the two can't drift.
 *
 * The pages themselves live in `web/` at the repo root and are deployed to
 * dcreators.in.
 */
const SITE = 'https://dcreators.in';

export const LegalUrls = {
  privacy: `${SITE}/privacy`,
  terms: `${SITE}/terms`,
  /** Play requires this to be reachable without installing the app. */
  deleteAccount: `${SITE}/delete-account`,
  support: 'mailto:support@dcreators.in',
} as const;
