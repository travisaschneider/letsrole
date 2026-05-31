import { allowedUploadExtensions, allowedUploads } from "../../../shared/Media";
import { ErrorCode } from "../../../shared/ErrorCode";
import { Template } from "../Template";

export class MediaValidation {
  public canBeJournalEntry(file: File): boolean {
    const type: string = file.type;
    const allowed: string[] = [
      "image/jpeg",
      "image/jpg",
      "image/gif",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    return allowed.indexOf(type) >= 0;
  }

  public validate(
    file: File,
    scope: MediaValidationScope
  ): MediaValidationStatus {
    const type: string = file.type;
    const size: number = file.size;
    const ext: string = file.name.split(".").pop().toLowerCase();

    if (scope !== MediaValidationScope.Journal) {
      if (type === "application/pdf" || ext === "pdf") {
        return {
          error: true,
          message: Template.__(
            'Error for file "%{filename}": please use the journal to upload pdfs.',
            {
              filename: file.name,
            }
          ),
          code: ErrorCode.UploadScopeJournal,
        };
      }
    }

    if (!allowedUploads[type]) {
      const message: string = Template.__(
        'Error for file "%{filename}" : file type "%{mime}" not allowed.',
        {
          filename: file.name,
          mime: type,
        }
      );

      return {
        error: true,
        message: message,
        code: ErrorCode.UploadMimeType,
      };
    }

    const maxSize: number = allowedUploads[type].size * 1024 * 1024;

    if (size > maxSize) {
      const message: string = Template.__(
        'Error for file "%{filename}" : file too big (maximum size for this type: %{maxsize}MB).)',
        {
          filename: file.name,
          maxsize: allowedUploads[type].size,
        }
      );

      return {
        error: true,
        message: message,
        code: ErrorCode.UploadSize,
      };
    }

    if (allowedUploadExtensions.indexOf(ext) < 0) {
      const message: string = Template.__(
        'Error for file "%{filename}" : this extension "%{ext}" is not allowed.)',
        {
          filename: file.name,
          ext: ext,
        }
      );

      return {
        error: true,
        message: message,
        code: ErrorCode.UploadExtension,
      };
    }

    return {
      error: false,
    };
  }
}

export interface MediaValidationStatus {
  error: boolean;
  message?: string;
  code?: number;
}

export enum MediaValidationScope {
  MediaManager,
  Journal,
}
