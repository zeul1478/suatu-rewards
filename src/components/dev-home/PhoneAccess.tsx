import QRCode from "qrcode";
import { lanAddresses } from "../../../scripts/lan-addresses.mjs";
import { Section } from "./Section";

export async function PhoneAccess() {
  const port = process.env.PORT ?? "3000";
  const protocol = process.env.DEV_PROTOCOL === "https" ? "https" : "http";
  const address = lanAddresses()[0];
  const url = address ? `${protocol}://${address}:${port}` : null;
  const qrSvg = url
    ? await QRCode.toString(url, {
        type: "svg",
        margin: 1,
        color: { dark: "#07231a", light: "#eaf4ee" },
      })
    : null;

  return (
    <Section
      title="1. Open the app on your phones"
      note="Use two phones — or one phone with two browser tabs — on the same Wi-Fi as this laptop."
    >
      {url && qrSvg ? (
        <div className="flex flex-wrap items-start gap-6">
          <div
            role="img"
            aria-label={`QR code for ${url}`}
            className="w-36 shrink-0 overflow-hidden rounded-[var(--radius-md)]"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <ol className="flex min-w-0 flex-1 basis-56 list-decimal flex-col gap-2 pl-5 text-sm text-ink-muted">
            <li>
              On the laptop, start the app with <code className="text-ink">pnpm dev:lan</code>{" "}
              (plain <code className="text-ink">pnpm dev</code> only serves this laptop).
            </li>
            <li>On each phone, scan the code with the camera, or type this address:</li>
            <li className="list-none">
              <span className="price-digits text-2xl break-all text-accent">{url}</span>
            </li>
            <li>You land on this page. Then pick a part below on each phone.</li>
          </ol>
        </div>
      ) : (
        <p className="text-sm text-warning">
          No Wi-Fi address found on this laptop. Connect to Wi-Fi and reload.
        </p>
      )}

      {protocol === "https" ? (
        <details className="rounded-[var(--radius-md)] border border-line p-4 text-sm text-ink-muted">
          <summary className="min-h-[var(--target-min)] cursor-pointer font-semibold text-ink">
            First time on a phone? Make it trust this laptop (once per phone)
          </summary>
          <div className="mt-3 flex flex-col gap-4">
            <p>
              The first visit shows a &ldquo;not private&rdquo; warning: choose Show details → visit
              this website. Then download the laptop&apos;s certificate:{" "}
              <a href="/dev/root-ca" className="font-semibold text-accent underline">
                download certificate
              </a>
              .
            </p>
            <div>
              <p className="font-semibold text-ink">iPhone / iPad</p>
              <ol className="list-decimal pl-5">
                <li>Tap Allow when Safari asks to download a configuration profile.</li>
                <li>Settings → Profile Downloaded → Install (enter your passcode).</li>
                <li>
                  Settings → General → About → Certificate Trust Settings → turn on the
                  &ldquo;mkcert&rdquo; certificate.
                </li>
              </ol>
            </div>
            <div>
              <p className="font-semibold text-ink">Android</p>
              <ol className="list-decimal pl-5">
                <li>Download the certificate with the link above.</li>
                <li>
                  Settings → Security → More security settings → Encryption &amp; credentials →
                  Install a certificate → CA certificate → choose the downloaded file.
                </li>
              </ol>
            </div>
            <p>Reload this page: the warning is gone, and the app can be installed.</p>
          </div>
        </details>
      ) : (
        <p className="text-sm text-ink-muted">
          Plain HTTP for now. To install the app on a phone, run{" "}
          <code className="text-ink">pnpm dev:cert</code> once, then restart{" "}
          <code className="text-ink">pnpm dev:lan</code>.
        </p>
      )}
    </Section>
  );
}
