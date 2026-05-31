export interface Media {
  id: string;
  path: string;
  filename: string;
  mime: string;
  type: string;
  size: number;
  created_at: string;
  title?: string;
  is_avatar: boolean;
  is_token: boolean;
}

export enum MediaSearchType {
  All = "all",
  Image = "image",
  Video = "video",
  Animated = "animated",
  AvatarToken = "avatartoken",
}

export enum MediaSearchSort {
  Name = "name",
  Size = "size",
  Date = "date",
}

export enum FolderSort {
  Date = "date",
  Name = "name",
}

export enum MediaSearchSortDirection {
  Asc = "asc",
  Desc = "desc",
}

export interface AllowedUpload {
  size: number;
}

export interface AllowedUploads {
  [mime: string]: AllowedUpload;
}

export const allowedUploadExtensions: string[] = [
  "jpeg",
  "jpg",
  "gif",
  "png",
  "webp",
  "webm",
  "mp4",
  "m4v",
  "pdf",
];

export const allowedUploads: AllowedUploads = {
  "image/jpeg": {
    size: 16,
  },
  "image/jpg": {
    size: 16,
  },
  "image/gif": {
    size: 32,
  },
  "image/png": {
    size: 32,
  },
  "image/webp": {
    size: 16,
  },
  "video/webm": {
    size: 128,
  },
  "video/mp4": {
    size: 128,
  },
  "video/m4v": {
    size: 128,
  },
  "application/pdf": {
    size: 32,
  },
};

export const MediaPerPage = 36;
