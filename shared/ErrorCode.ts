export enum ErrorCode {
  // Connecting to the app
  Architect = 3100,
  InitClosed = 3001,
  InitError = 3002,
  InitRole = 3003,
  InitTable = 3004,
  InitSystem = 3005,
  InitGeneral = 3006,
  InitTimeout = 3007,
  ClientTimeout = 3008,
  TokenAuth = 3009,
  ReconnectTokenAuth = 3010,

  // CDN Upload (local errors)
  UploadMimeType = 4505,
  UploadSize = 4506,
  UploadExtension = 4507,
  UploadScopeJournal = 4508, // file should be uploaded in the journal
}
