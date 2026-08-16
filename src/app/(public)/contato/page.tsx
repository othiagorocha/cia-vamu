import type { Metadata } from "next";

import { ContactView } from "@/modules/contact/ui/views/contact-view";
import { HydrateClient, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Contato",
  description: "Fale com a CIA VAMU: dúvidas, convites e parcerias.",
};

export const dynamic = "force-dynamic";

const ContactPage = () => {
  void trpc.social.listPublished.prefetch();

  return (
    <HydrateClient>
      <ContactView />
    </HydrateClient>
  );
};

export default ContactPage;
