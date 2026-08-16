"use client";

import { useTranslations } from "next-intl";

import { trpc } from "@/trpc/client";

export const AboutMembers = () => {
  const t = useTranslations("about.members");
  const { data } = trpc.members.listPublic.useQuery();

  if (!data || data.length === 0) {
    return (
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">{t("title")}</h2>
        <p className="text-muted-foreground">{t("empty")}</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-2xl font-semibold tracking-tight">{t("title")}</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {data.map((member) => (
          <article
            key={member.userId}
            className="flex flex-col gap-3 rounded-lg border p-6"
          >
            {member.photoUrl ? (
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={member.photoUrl}
                  alt={member.name}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : null}
            <h3 className="text-lg font-semibold">{member.name}</h3>
            {member.role ? (
              <p className="text-sm text-orange-400">{member.role}</p>
            ) : null}
            {member.testimony ? (
              <p className="text-sm text-muted-foreground">{member.testimony}</p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
};
