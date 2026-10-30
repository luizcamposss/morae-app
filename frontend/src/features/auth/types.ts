export type LoginRequest = {
  email: string;
  password: string;
};

export type AuthResponse = {
  success: boolean;
  message: string;
  token: string | null;
};