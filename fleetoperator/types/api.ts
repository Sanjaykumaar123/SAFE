/** Normalized shape every API error is translated into by the API client —
 * screens branch on `.message` / `.status`, never a raw axios error. */
export interface ApiError {
  status: number | null;
  message: string;
  isNetworkError: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}
