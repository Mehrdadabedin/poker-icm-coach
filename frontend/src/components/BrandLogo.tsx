/**
 * Shared ICM MASTER logo mark for the top-left branding in every header.
 *
 * The shared asset `frontend/public/Logo/logo.png` (current artwork 2170x725) is
 * shown at a controlled header size by `styles/brand.css`, never at its natural
 * dimensions. The image is decorative (`alt=""`) because the accessible name
 * comes from the visually hidden "ICM MASTER" text, so headings that use this
 * component keep the same accessible name and DOM text as the old wordmark.
 */
export function BrandLogo() {
  return (
    <>
      <img className="brand-logo" src="/Logo/logo.png" alt="" width={40} height={40} />
      <span className="sr-only">ICM MASTER</span>
    </>
  );
}
