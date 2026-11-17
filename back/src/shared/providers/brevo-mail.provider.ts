import { BrevoClient } from "@getbrevo/brevo";
import type { IMailProvider, MailMessage } from "@/shared/providers/mail-provider.interface";

interface MailSender {
  email: string;
  name: string;
}

export class BrevoMailProvider implements IMailProvider {
  private readonly client: BrevoClient;

  constructor(
    apiKey: string,
    private readonly sender: MailSender,
  ) {
    this.client = new BrevoClient({ apiKey });
  }

  async send({ to, subject, html }: MailMessage): Promise<void> {
    await this.client.transactionalEmails.sendTransacEmail({
      sender: this.sender,
      to: [{ email: to }],
      subject,
      htmlContent: html,
    });
  }
}
