/**
 * Masks sensitive values before sending prompts to third-party LLM APIs.
 * Required by PRD Appendix C.3: Gemini free plan may use inputs for training,
 * so monetary values, quantities, and emails must never leave the system in plaintext.
 */

const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const KRW_RE = /(?:₩|KRW\s*)?\d{1,3}(?:,\d{3})+\s*(?:원|KRW)?|\d+\s*원/g;
const USD_RE = /\$\s*\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?\s*(?:USD|달러)/gi;
const QUANTITY_RE = /\d+\s*(?:주|shares?)/gi;
const PERCENT_PRICE_RE = /평단\s*(?:가|은|는)?\s*[:=]?\s*[\d.,]+/g;

export interface SanitizeOptions {
  /** Replacement token for monetary values. Default: '[MASKED_AMOUNT]' */
  amountToken?: string;
  /** Replacement token for quantities. Default: '[MASKED_QTY]' */
  quantityToken?: string;
  /** Replacement token for emails. Default: '[MASKED_EMAIL]' */
  emailToken?: string;
}

export function sanitizePrompt(input: string, options: SanitizeOptions = {}): string {
  const amount = options.amountToken ?? '[MASKED_AMOUNT]';
  const quantity = options.quantityToken ?? '[MASKED_QTY]';
  const email = options.emailToken ?? '[MASKED_EMAIL]';

  return input
    .replace(EMAIL_RE, email)
    .replace(PERCENT_PRICE_RE, `평단 ${amount}`)
    .replace(KRW_RE, amount)
    .replace(USD_RE, amount)
    .replace(QUANTITY_RE, quantity);
}
