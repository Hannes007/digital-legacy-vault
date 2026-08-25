import { InvalidEmailError } from '../errors/identity.errors';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Email value object — normalises to lowercase (the database stores the
 * normalised form; citext is deferred, see prisma/schema.prisma header) and
 * rejects structurally invalid addresses.
 */
export class Email {
  private constructor(
    /** Normalised (trimmed, lowercased) address. */
    public readonly value: string,
  ) {}

  /**
   * Create a validated, normalised Email.
   *
   * @throws {InvalidEmailError} when the input is not a plausible address.
   */
  static create(raw: string): Email {
    const normalised = raw.trim().toLowerCase();
    if (normalised.length < 3 || normalised.length > 320 || !EMAIL_PATTERN.test(normalised)) {
      throw new InvalidEmailError();
    }
    return new Email(normalised);
  }

  /** Value equality. */
  equals(other: Email): boolean {
    return this.value === other.value;
  }

  /** Masked form safe for structured logs: `j***@example.com`. */
  get masked(): string {
    const [local = '', domain = ''] = this.value.split('@');
    return `${local.slice(0, 1)}***@${domain}`;
  }
}
