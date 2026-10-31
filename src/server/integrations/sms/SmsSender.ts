export type SmsMessage = { to: string; body: string };

/** Sends a text. Twilio when its keys are set; otherwise texts are only recorded (local, tests). */
export interface SmsSender {
  /** Whether texts really leave the app (false: recorded only, shown on the dev texts page). */
  readonly live: boolean;
  send(message: SmsMessage): Promise<void>;
}
