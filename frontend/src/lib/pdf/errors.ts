export class PdfDeskError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'PdfDeskError';
  }
}

export class NotAPdfError extends PdfDeskError {
  constructor(public readonly fileName: string) {
    super(`"${fileName}" is not a PDF file.`, 'NOT_A_PDF');
    this.name = 'NotAPdfError';
  }
}

export class EncryptedPdfError extends PdfDeskError {
  constructor(public readonly fileName: string) {
    super(
      `"${fileName}" is password-protected. Remove the password and try again.`,
      'ENCRYPTED_PDF',
    );
    this.name = 'EncryptedPdfError';
  }
}

export class MalformedPdfError extends PdfDeskError {
  constructor(
    public readonly fileName: string,
    public override readonly cause: unknown,
  ) {
    super(`"${fileName}" could not be read. The file may be damaged.`, 'MALFORMED_PDF');
    this.name = 'MalformedPdfError';
  }
}

export class FileTooLargeError extends PdfDeskError {
  constructor(
    public readonly fileName: string,
    public readonly limitMb: number,
  ) {
    super(`"${fileName}" is larger than the ${limitMb} MB limit.`, 'FILE_TOO_LARGE');
    this.name = 'FileTooLargeError';
  }
}

export class TooManyPagesError extends PdfDeskError {
  constructor(
    public readonly fileName: string,
    public readonly limit: number,
    public readonly count: number,
  ) {
    super(`"${fileName}" has ${count} pages; the limit is ${limit}.`, 'TOO_MANY_PAGES');
    this.name = 'TooManyPagesError';
  }
}