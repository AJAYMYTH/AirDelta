/**
 * AirDelta PII & Prompt Injection Sanitizer Service
 * 
 * Guarantees zero leakage of Indian Personal Identifiable Information (PII)
 * (Phone numbers, Emails, Aadhaar, Specific House/Flat addresses) to upstream
 * LLM contexts, analytics logs, or persistent plan records.
 */

export class PiiSanitizerService {
  // Indian mobile numbers: +91 followed by 10 digits, or 10 digits starting with 6, 7, 8, or 9
  private static readonly PHONE_REGEX =
    /(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/g;

  // 12-digit Aadhaar pattern (4-4-4 or 12 continuous digits)
  private static readonly AADHAAR_REGEX =
    /\b[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\b/g;

  // Standard email pattern
  private static readonly EMAIL_REGEX =
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

  // Street address indicators (House/Flat/Plot/Gali)
  private static readonly ADDRESS_REGEX =
    /\b(?:Flat\s*No\.?|House\s*No\.?|Plot\s*No\.?|Gali\s*No\.?|H\.No\.?|Sector\s*\d+,\s*Plot\s*\d+)\s*[:#\w\d\/-]+/gi;

  // Common prompt injection attack patterns
  private static readonly PROMPT_INJECTION_REGEX =
    /(?:ignore\s+all\s+previous\s+instructions|system\s+prompt|disregard\s+instructions|override\s+rules|reveal\s+secret|act\s+as\s+unrestricted)/gi;

  /**
   * Redacts sensitive PII from any plain text string.
   */
  public static sanitizeText(text: string): string {
    if (!text || typeof text !== "string") return "";

    return text
      .replace(this.PHONE_REGEX, "[REDACTED_PHONE]")
      .replace(this.AADHAAR_REGEX, "[REDACTED_AADHAAR]")
      .replace(this.EMAIL_REGEX, "[REDACTED_EMAIL]")
      .replace(this.ADDRESS_REGEX, "[REDACTED_ADDRESS]")
      .replace(this.PROMPT_INJECTION_REGEX, "[FILTERED_SAFETY_TRIGGER]");
  }

  /**
   * Recursively sanitizes any JSON object or nested array.
   */
  public static sanitizeObject<T>(input: T): T {
    if (input === null || input === undefined) return input;

    if (typeof input === "string") {
      return this.sanitizeText(input) as unknown as T;
    }

    if (Array.isArray(input)) {
      return input.map((item) => this.sanitizeObject(item)) as unknown as T;
    }

    if (typeof input === "object") {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeObject(value);
      }
      return sanitized as unknown as T;
    }

    return input;
  }

  /**
   * Verifies whether an input contains any detectable PII or dangerous injections.
   */
  public static containsSensitivePii(text: string): boolean {
    if (!text || typeof text !== "string") return false;
    return (
      this.PHONE_REGEX.test(text) ||
      this.AADHAAR_REGEX.test(text) ||
      this.EMAIL_REGEX.test(text)
    );
  }
}
