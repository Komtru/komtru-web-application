import { useMutation, useQuery } from "@tanstack/react-query";

import type { IResponse } from "@/interfaces/IAxios";
import type {
  AccountBundle,
  ForgotPasswordPayloadInterface,
  LoginPayloadInterface,
  LoginResultInterface,
  MessageResultInterface,
  RegisterPayloadInterface,
  ResendLogin2FAPayloadInterface,
  ResetPasswordPayloadInterface,
  SendVerificationEmailPayloadInterface,
  SessionResultInterface,
  TwoFactorFinishPayloadInterface,
  TwoFactorInitPayloadInterface,
  TwoFactorInitResult,
  VerifyEmailPayloadInterface,
  VerifyLogin2FAPayloadInterface,
} from "@/interfaces/auth";
import http from "@/services/base";

/** Structured, exported keys so invalidation never guesses at a string. */
export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
};

export function useLogin() {
  return useMutation<LoginResultInterface, string, LoginPayloadInterface>({
    mutationFn: async (payload) => {
      const response = await http.post<IResponse<LoginResultInterface>>({
        url: "auth/login",
        body: payload,
      });
      return response.data;
    },
  });
}

export function useRegister() {
  return useMutation<SessionResultInterface, string, RegisterPayloadInterface>({
    mutationFn: async (payload) => {
      const response = await http.post<IResponse<SessionResultInterface>>({
        url: "auth/create-account",
        body: payload,
      });
      return response.data;
    },
  });
}

export function useLogout() {
  return useMutation<MessageResultInterface, string, { refreshToken?: string }>({
    mutationFn: async (payload) => {
      const response = await http.post<IResponse<MessageResultInterface>>({
        url: "auth/logout",
        body: payload,
      });
      return response.data;
    },
  });
}

export function useSendVerificationEmail() {
  return useMutation<MessageResultInterface, string, SendVerificationEmailPayloadInterface>({
    mutationFn: async (payload) => {
      const response = await http.post<IResponse<MessageResultInterface>>({
        url: "auth/send-verification-email",
        body: payload,
      });
      return response.data;
    },
  });
}

export function useVerifyEmail() {
  return useMutation<MessageResultInterface, string, VerifyEmailPayloadInterface>({
    mutationFn: async (payload) => {
      const response = await http.post<IResponse<MessageResultInterface>>({
        url: "auth/verify-email",
        body: payload,
      });
      return response.data;
    },
  });
}

export function useForgotPassword() {
  return useMutation<MessageResultInterface, string, ForgotPasswordPayloadInterface>({
    mutationFn: async (payload) => {
      const response = await http.post<IResponse<MessageResultInterface>>({
        url: "auth/forgot-password",
        body: payload,
      });
      return response.data;
    },
  });
}

export function useResetPassword() {
  return useMutation<MessageResultInterface, string, ResetPasswordPayloadInterface>({
    mutationFn: async (payload) => {
      const response = await http.post<IResponse<MessageResultInterface>>({
        url: "auth/reset-password",
        body: payload,
      });
      return response.data;
    },
  });
}

export function useVerifyLogin2FA() {
  return useMutation<SessionResultInterface, string, VerifyLogin2FAPayloadInterface>({
    mutationFn: async (payload) => {
      const response = await http.post<IResponse<SessionResultInterface>>({
        url: "auth/verify-login-2fa",
        body: payload,
      });
      return response.data;
    },
  });
}

export function useResendLogin2FA() {
  return useMutation<MessageResultInterface, string, ResendLogin2FAPayloadInterface>({
    mutationFn: async (payload) => {
      const response = await http.post<IResponse<MessageResultInterface>>({
        url: "auth/resend-login-2fa",
        body: payload,
      });
      return response.data;
    },
  });
}

export function useInitTwoFactor() {
  return useMutation<TwoFactorInitResult, string, TwoFactorInitPayloadInterface>({
    mutationFn: async (payload) => {
      const response = await http.post<IResponse<TwoFactorInitResult>>({
        url: "users/two-factor/init",
        body: payload,
      });
      return response.data;
    },
  });
}

export function useFinishTwoFactor() {
  return useMutation<MessageResultInterface, string, TwoFactorFinishPayloadInterface>({
    mutationFn: async (payload) => {
      const response = await http.post<IResponse<MessageResultInterface>>({
        url: "users/two-factor/finish",
        body: payload,
      });
      return response.data;
    },
  });
}

export function useMe(enabled = true) {
  return useQuery<AccountBundle>({
    queryKey: authKeys.me(),
    enabled,
    queryFn: async () => {
      const response = await http.get<IResponse<AccountBundle>>({ url: "users/me" });
      return response.data;
    },
  });
}
