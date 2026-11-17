export interface MailMessage {
  to: string;
  subject: string;
  html: string;
}

export interface IMailProvider {
  send(message: MailMessage): Promise<void>;
}
