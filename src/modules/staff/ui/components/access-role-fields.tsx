"use client";

import { useTranslations } from "next-intl";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EDITOR_CAPABILITIES,
  type EditorCapability,
  type SiteRole,
} from "@/lib/permissions";

const MODULE_LABELS: Record<EditorCapability, "events" | "albums" | "site"> = {
  "events:write": "events",
  "albums:write": "albums",
  "site:write": "site",
};

type AccessRoleFieldsProps = {
  accessRole: SiteRole;
  modules: EditorCapability[];
  onRoleChange: (role: SiteRole) => void;
  onModulesChange: (modules: EditorCapability[]) => void;
  modulesError?: { message?: string };
  disabled?: boolean;
};

export const AccessRoleFields = ({
  accessRole,
  modules,
  onRoleChange,
  onModulesChange,
  modulesError,
  disabled = false,
}: AccessRoleFieldsProps) => {
  const t = useTranslations("staff");

  const toggleModule = (capability: EditorCapability, checked: boolean) => {
    const next = checked
      ? [...modules, capability]
      : modules.filter((item) => item !== capability);
    onModulesChange(next);
  };

  return (
    <>
      <Field>
        <FieldLabel>{t("form.accessRole")}</FieldLabel>
        <Select
          value={accessRole}
          onValueChange={(value) => onRoleChange(value as SiteRole)}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["member", "editor", "gestor"] as const).map((role) => (
              <SelectItem key={role} value={role}>
                {t(`roles.${role}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {t(`roles.${accessRole}Hint`)}
        </p>
      </Field>

      {accessRole === "editor" ? (
        <Field data-invalid={Boolean(modulesError)}>
          <FieldLabel>{t("form.modules")}</FieldLabel>
          <p className="text-sm text-muted-foreground">{t("form.modulesHint")}</p>
          <div className="flex flex-col gap-2">
            {EDITOR_CAPABILITIES.map((capability) => (
              <label key={capability} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 size-4 rounded border-input accent-orange-400"
                  checked={modules.includes(capability)}
                  disabled={disabled}
                  onChange={(event) =>
                    toggleModule(capability, event.target.checked)
                  }
                />
                <span>
                  <span className="font-medium">
                    {t(`capabilities.${MODULE_LABELS[capability]}`)}
                  </span>
                  <span className="block text-muted-foreground">
                    {t(`capabilities.${MODULE_LABELS[capability]}Hint`)}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <FieldError errors={modulesError ? [modulesError] : []} />
        </Field>
      ) : null}
    </>
  );
};
