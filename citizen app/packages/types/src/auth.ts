export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  city: string | null;
  profilePhotoUrl: string | null;
  role: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

export interface AuthResponse {
  user: User;
  tokens: TokenPair;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  city: string;
  acceptedTerms: boolean;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}
