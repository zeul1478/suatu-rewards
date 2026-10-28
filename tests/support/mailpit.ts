import { env } from "./env";

type MailpitSummary = { ID: string; Subject: string };

/** Waits for the newest email to `to` (optionally matching a subject) and returns its text body. */
export async function latestEmailText(
  to: string,
  options: { subjectIncludes?: string; timeoutMs?: number; after?: number } = {},
): Promise<string> {
  const deadline = Date.now() + (options.timeoutMs ?? 10_000);
  const query = encodeURIComponent(`to:"${to}"`);
  while (Date.now() < deadline) {
    const response = await fetch(`${env.mailpitUrl}/api/v1/search?query=${query}`);
    const { messages = [] } = (await response.json()) as { messages?: MailpitSummary[] };
    const match = messages
      .filter(
        (message) => !options.subjectIncludes || message.Subject.includes(options.subjectIncludes),
      )
      .at(options.after ?? 0);
    if (match) {
      const detail = await fetch(`${env.mailpitUrl}/api/v1/message/${match.ID}`);
      const { Text } = (await detail.json()) as { Text: string };
      return Text;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No email to ${to} within the timeout`);
}

/** Mailpit lists newest first; count of matching emails so a test can wait for "one more". */
export async function emailCount(to: string, subjectIncludes: string): Promise<number> {
  const query = encodeURIComponent(`to:"${to}"`);
  const response = await fetch(`${env.mailpitUrl}/api/v1/search?query=${query}`);
  const { messages = [] } = (await response.json()) as { messages?: MailpitSummary[] };
  return messages.filter((message) => message.Subject.includes(subjectIncludes)).length;
}

export function firstLink(text: string): string {
  const url = /https?:\/\/\S+/.exec(text)?.[0];
  if (!url) throw new Error("No link in email");
  return url;
}
