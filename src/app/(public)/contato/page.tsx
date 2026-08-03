import type { Metadata } from "next";

import { ContactView } from "@/modules/contact/ui/views/contact-view";

export const metadata: Metadata = {
  title: "Contato | CIA VAMU",
  description: "Fale com a CIA VAMU: dúvidas, convites e parcerias.",
};

const ContactPage = () => {
  return <ContactView />;
};

export default ContactPage;
