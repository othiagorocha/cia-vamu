import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { isErrorMessageKey } from "@/lib/client-error";
import { signInAction } from "@/modules/auth/server/actions";
import { LoginSubmitButton } from "@/modules/auth/ui/components/login-submit-button";

type LoginViewProps = {
  redirectTo: string;
  error: string | undefined;
};

export const LoginView = async ({ redirectTo, error }: LoginViewProps) => {
  const t = await getTranslations("auth.login");
  const tErrors = await getTranslations("common.errors");
  const errorMessage =
    error && isErrorMessageKey(error) ? tErrors(error) : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="justify-items-center text-center">
          <Logo variant="white" className="mb-2 size-16" priority />
          <CardTitle className="text-2xl font-semibold">{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signInAction} className="space-y-6">
            <input type="hidden" name="redirectTo" value={redirectTo} />
            {errorMessage ? (
              <p className="text-center text-sm text-destructive" role="alert">
                {errorMessage}
              </p>
            ) : null}
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="voce@ciavamu.com"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  minLength={8}
                  required
                />
              </Field>
            </FieldGroup>
            <LoginSubmitButton label={t("submit")} />
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
