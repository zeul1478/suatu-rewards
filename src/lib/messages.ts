/*
 * Message wording, shared by the owner's preview (browser) and the sender (server), so what the
 * owner sees is exactly what goes out (D84).
 */

export const MESSAGE_EVENTS = [
  "welcome",
  "visit_added",
  "reward_unlocked",
  "reward_used",
  "birthday",
  "we_miss_you",
  "points_expiring",
] as const;
export type MessageEvent = (typeof MESSAGE_EVENTS)[number];
export type MessageChannel = "sms" | "email";

/** Offers rather than news about the customer's own points: they need a marketing opt-in. */
export const MARKETING_EVENTS: readonly string[] = ["birthday", "we_miss_you", "broadcast"];

/** The blanks an owner can use; filled in for each customer when the message is sent. */
export const PLACEHOLDERS = [
  "first_name",
  "store",
  "points",
  "points_added",
  "reward",
  "points_to_go",
  "bonus",
  "days",
  "link",
] as const;
export type MessageValues = Partial<Record<(typeof PLACEHOLDERS)[number], string | number>>;

/** Fills {first_name} and the other blanks; unknown or empty blanks become nothing. */
export function renderMessage(text: string, values: MessageValues): string {
  return text
    .replace(/\{(\w+)\}/g, (_, key: string) => {
      const value = values[key as keyof MessageValues];
      return value === undefined || value === null ? "" : String(value);
    })
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** Added to every offer text; carriers require a way out, and Twilio handles the reply. */
export const STOP_LINE = { en: "Reply STOP to opt out.", ro: "Răspunde STOP pentru dezabonare." };

/** Text length → number of SMS parts (160 characters, or 70 with letters like ă/ț). */
export function smsParts(text: string): number {
  const unicode = /[^\x20-\x7E\n\r]/.test(text);
  const single = unicode ? 70 : 160;
  const multi = unicode ? 67 : 153;
  return text.length <= single ? 1 : Math.ceil(text.length / multi);
}

type Wording = { subject: string; body: string };
type Defaults = Record<MessageEvent, Record<MessageChannel, Wording>>;

const en: Defaults = {
  welcome: {
    sms: {
      subject: "",
      body: "Welcome to {store} Rewards, {first_name}! {points} points so far. {link}",
    },
    email: {
      subject: "Welcome to {store} Rewards",
      body: "Hi {first_name},\n\nThanks for joining {store} Rewards. Give your phone number at the counter on every visit and watch your points add up.\n\nYou have {points} points so far: {link}",
    },
  },
  visit_added: {
    sms: {
      subject: "",
      body: "+{points_added} points at {store}! You have {points}. {points_to_go} more to {reward}.",
    },
    email: {
      subject: "+{points_added} points at {store}",
      body: "Hi {first_name},\n\nThanks for coming by. You now have {points} points: {points_to_go} more to {reward}.\n\n{link}",
    },
  },
  reward_unlocked: {
    sms: {
      subject: "",
      body: "{first_name}, your {reward} is ready at {store}! Show your code at the counter: {link}",
    },
    email: {
      subject: "Your {reward} is ready",
      body: "Hi {first_name},\n\nYou've earned a {reward}. Open the app and show your code at the counter:\n{link}",
    },
  },
  reward_used: {
    sms: {
      subject: "",
      body: "Enjoy your {reward}, {first_name}! You have {points} points left at {store}.",
    },
    email: {
      subject: "Enjoy your {reward}",
      body: "Hi {first_name},\n\nEnjoy your {reward}! You have {points} points left toward the next one.\n\n{link}",
    },
  },
  birthday: {
    sms: {
      subject: "",
      body: "Happy birthday, {first_name}! {store} gave you {bonus} bonus points. {link}",
    },
    email: {
      subject: "Happy birthday from {store}",
      body: "Happy birthday, {first_name}!\n\nWe've added {bonus} bonus points to your card. See you soon.\n\n{link}",
    },
  },
  we_miss_you: {
    sms: {
      subject: "",
      body: "We miss you at {store}, {first_name}! You have {points} points waiting. {link}",
    },
    email: {
      subject: "We miss you at {store}",
      body: "Hi {first_name},\n\nIt's been a while. You still have {points} points waiting: {points_to_go} more to {reward}.\n\n{link}",
    },
  },
  points_expiring: {
    sms: {
      subject: "",
      body: "{first_name}, your {points} points at {store} expire in {days} days. Come by to keep them!",
    },
    email: {
      subject: "Your points expire in {days} days",
      body: "Hi {first_name},\n\nYour {points} points at {store} expire in {days} days. Any visit before then keeps them.\n\n{link}",
    },
  },
};

const ro: Defaults = {
  welcome: {
    sms: {
      subject: "",
      body: "Bun venit în {store} Rewards, {first_name}! Ai {points} puncte. {link}",
    },
    email: {
      subject: "Bun venit în {store} Rewards",
      body: "Bună, {first_name},\n\nMulțumim că te-ai alăturat. Spune numărul de telefon la casă la fiecare vizită și strângi puncte.\n\nAi {points} puncte: {link}",
    },
  },
  visit_added: {
    sms: {
      subject: "",
      body: "+{points_added} puncte la {store}! Ai {points}. Încă {points_to_go} până la {reward}.",
    },
    email: {
      subject: "+{points_added} puncte la {store}",
      body: "Bună, {first_name},\n\nMulțumim pentru vizită. Ai {points} puncte: încă {points_to_go} până la {reward}.\n\n{link}",
    },
  },
  reward_unlocked: {
    sms: {
      subject: "",
      body: "{first_name}, {reward} te așteaptă la {store}! Arată codul la casă: {link}",
    },
    email: {
      subject: "{reward} te așteaptă",
      body: "Bună, {first_name},\n\nAi câștigat {reward}. Deschide aplicația și arată codul la casă:\n{link}",
    },
  },
  reward_used: {
    sms: { subject: "", body: "Poftă bună, {first_name}! Îți rămân {points} puncte la {store}." },
    email: {
      subject: "Poftă bună!",
      body: "Bună, {first_name},\n\nSperăm că te bucuri de {reward}! Îți rămân {points} puncte pentru următoarea.\n\n{link}",
    },
  },
  birthday: {
    sms: {
      subject: "",
      body: "La mulți ani, {first_name}! {store} ți-a dăruit {bonus} puncte. {link}",
    },
    email: {
      subject: "La mulți ani de la {store}",
      body: "La mulți ani, {first_name}!\n\nȚi-am adăugat {bonus} puncte cadou. Te așteptăm.\n\n{link}",
    },
  },
  we_miss_you: {
    sms: { subject: "", body: "Ne lipsești, {first_name}! Ai {points} puncte la {store}. {link}" },
    email: {
      subject: "Ne lipsești la {store}",
      body: "Bună, {first_name},\n\nA trecut ceva timp. Ai încă {points} puncte: mai ai {points_to_go} până la {reward}.\n\n{link}",
    },
  },
  points_expiring: {
    sms: {
      subject: "",
      body: "{first_name}, cele {points} puncte la {store} expiră în {days} zile. Treci pe la noi!",
    },
    email: {
      subject: "Punctele tale expiră în {days} zile",
      body: "Bună, {first_name},\n\nCele {points} puncte la {store} expiră în {days} zile. Orice vizită până atunci le păstrează.\n\n{link}",
    },
  },
};

/** The wording an owner starts from, in the store's language. */
export function defaultWording(
  locale: string,
  event: MessageEvent,
  channel: MessageChannel,
): Wording {
  return (locale.startsWith("ro") ? ro : en)[event][channel];
}

export function stopLine(locale: string): string {
  return locale.startsWith("ro") ? STOP_LINE.ro : STOP_LINE.en;
}

/** Sample values for the owner's preview. */
export function sampleValues(store: string, link: string, reward: string): MessageValues {
  return {
    first_name: "Ana",
    store,
    points: 45,
    points_added: 5,
    reward,
    points_to_go: 55,
    bonus: 20,
    days: 14,
    link,
  };
}
