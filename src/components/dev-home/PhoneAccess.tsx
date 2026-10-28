import QRCode from "qrcode";
import { lanAddresses } from "../../../scripts/lan-addresses.mjs";
import { Section } from "./Section";

export async function PhoneAccess() {
  const port = process.env.PORT ?? "3000";
  const address = lanAddresses()[0];
  const url = address ? `http://${address}:${port}` : null;
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
    </Section>
  );
}
