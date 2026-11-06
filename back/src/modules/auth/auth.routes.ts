import { Router } from "express";
import {
  loginRateLimiter,
  passwordRecoveryRateLimiter,
  registerRateLimiter,
} from "@/config/rate-limit";
import type { AuthController } from "@/modules/auth/auth.controller";
import {
  forgotPasswordRequestSchema,
  loginRequestSchema,
  otpResendRequestSchema,
  otpVerifyRequestSchema,
  registerRequestSchema,
  resetPasswordRequestSchema,
} from "@/modules/auth/dto/auth.dto";
import { validate } from "@/shared/middlewares/validate";

export function createAuthRouter(controller: AuthController): Router {
  const router = Router();

  router.post(
    "/register",
    registerRateLimiter,
    validate({ body: registerRequestSchema }),
    controller.register,
  );
  router.post(
    "/otp/verify",
    registerRateLimiter,
    validate({ body: otpVerifyRequestSchema }),
    controller.verifyOtp,
  );
  router.post(
    "/otp/resend",
    registerRateLimiter,
    validate({ body: otpResendRequestSchema }),
    controller.resendOtp,
  );
  router.post(
    "/password/forgot",
    passwordRecoveryRateLimiter,
    validate({ body: forgotPasswordRequestSchema }),
    controller.forgotPassword,
  );
  router.post(
    "/password/reset",
    registerRateLimiter,
    validate({ body: resetPasswordRequestSchema }),
    controller.resetPassword,
  );
  router.post("/login", loginRateLimiter, validate({ body: loginRequestSchema }), controller.login);
  router.post("/refresh", controller.refresh);
  router.post("/logout", controller.logout);

  return router;
}
