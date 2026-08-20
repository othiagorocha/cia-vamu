const AUTH_CODE_KEYS = {
  INVALID_EMAIL_OR_PASSWORD: "invalidCredentials",
  USER_NOT_FOUND: "invalidCredentials",
  INVALID_PASSWORD: "invalidCredentials",
  TOO_MANY_REQUESTS: "tooManyRequests",
  FAILED_TO_CREATE_SESSION: "sessionFailed",
} as const;

const AUTH_MESSAGE_KEYS = {
  "Invalid email or password": "invalidCredentials",
  "Invalid password": "invalidCredentials",
  "User not found": "invalidCredentials",
  "invalid password": "invalidCredentials",
  "Too many requests. Please try again later.": "tooManyRequests",
  "Too many requests": "tooManyRequests",
} as const;

const ERROR_MESSAGE_KEYS = [
  "invalidCredentials",
  "tooManyRequests",
  "sessionFailed",
  "server",
  "generic",
] as const;

export type ErrorMessageKey = (typeof ERROR_MESSAGE_KEYS)[number];

export type ClientErrorLike = {
  message?: string;
  code?: string;
  status?: number;
};

export const isErrorMessageKey = (value: string): value is ErrorMessageKey =>
  ERROR_MESSAGE_KEYS.includes(value as ErrorMessageKey);

export const clientErrorKey = (error: ClientErrorLike): ErrorMessageKey => {
  const codeKey = error.code
    ? AUTH_CODE_KEYS[error.code as keyof typeof AUTH_CODE_KEYS]
    : undefined;

  if (codeKey) return codeKey;

  const messageKey = error.message
    ? AUTH_MESSAGE_KEYS[error.message as keyof typeof AUTH_MESSAGE_KEYS]
    : undefined;

  if (messageKey) return messageKey;

  if (error.status === 500) return "server";

  return "generic";
};

export const clientErrorMessage = (
  error: ClientErrorLike,
  t: (key: ErrorMessageKey) => string,
) => {
  const codeKey = error.code
    ? AUTH_CODE_KEYS[error.code as keyof typeof AUTH_CODE_KEYS]
    : undefined;

  if (codeKey) {
    return t(codeKey);
  }

  const messageKey = error.message
    ? AUTH_MESSAGE_KEYS[error.message as keyof typeof AUTH_MESSAGE_KEYS]
    : undefined;

  if (messageKey) {
    return t(messageKey);
  }

  if (error.status === 500) {
    return t("server");
  }

  if (error.message) {
    return error.message;
  }

  return t("generic");
};
