/** Standard API response envelope */
export interface ApiResponse<T> {
  data: T;
  meta?: ApiMeta;
  errors: null;
}

/** Standard API error response */
export interface ApiErrorResponse {
  data: null;
  meta?: undefined;
  errors: ApiError[];
}

export interface ApiMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiError {
  code: string;
  message: string;
  field?: string;
}

/** Auth token pair returned on login/refresh */
export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  email: string;
  password: string;
  displayName: string;
}

export interface OtpSendPayload {
  phone: string;
}

export interface OtpVerifyPayload {
  phone: string;
  code: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  fileKey: string;
  mediaId: string;
}
