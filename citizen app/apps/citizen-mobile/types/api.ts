/** Normalized shape every API error is translated into by the API client
 * (section 35/47) — screens branch on `.message` / `.status`, never on a
 * raw axios error. */
export interface ApiError {
  status: number | null;
  message: string;
  isNetworkError: boolean;
}
