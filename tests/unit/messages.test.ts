import { parse, TYPE, type MessageFormatElement } from "@formatjs/icu-messageformat-parser";
import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import ro from "@/messages/ro.json";

/*
 * Every language file has the same texts as English (§8 Romania-ready): same keys, same
 * {placeholders}, valid ICU (the build precompiles them), and Romanian plurals with "few".
 */

type Messages = { [key: string]: string | Messages };

function flatten(messages: Messages, prefix = ""): Map<string, string> {
  const result = new Map<string, string>();
  for (const [key, value] of Object.entries(messages)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") result.set(path, value);
    else for (const [k, v] of flatten(value, path)) result.set(k, v);
  }
  return result;
}

/** Placeholder names, and whether any plural lacks a "few" branch. */
function inspect(
  elements: MessageFormatElement[],
  found = { args: new Set<string>(), pluralWithoutFew: false },
) {
  for (const element of elements) {
    if (
      element.type === TYPE.argument ||
      element.type === TYPE.number ||
      element.type === TYPE.date
    ) {
      found.args.add(element.value);
    }
    if (element.type === TYPE.plural || element.type === TYPE.select) {
      found.args.add(element.value);
      if (
        element.type === TYPE.plural &&
        element.pluralType === "cardinal" &&
        !("few" in element.options)
      ) {
        found.pluralWithoutFew = true;
      }
      for (const option of Object.values(element.options)) inspect(option.value, found);
    }
    if (element.type === TYPE.tag) inspect(element.children, found);
  }
  return found;
}

const english = flatten(en as Messages);

describe.each([["ro", ro as Messages]])("%s.json", (locale, messages) => {
  const translated = flatten(messages);

  it("has exactly the English keys", () => {
    expect([...translated.keys()].sort()).toEqual([...english.keys()].sort());
  });

  it("every text is valid and keeps the English placeholders", () => {
    for (const [key, text] of translated) {
      const ours = inspect(parse(text));
      const theirs = inspect(parse(english.get(key)!));
      expect([...ours.args].sort(), `${locale}: ${key}`).toEqual([...theirs.args].sort());
      if (locale === "ro") expect(ours.pluralWithoutFew, `${locale}: ${key}`).toBe(false);
    }
  });
});
