"use client";

import { useEffect } from "react";

/**
 * Última rede de segurança: cobre erros que acontecem no próprio
 * `layout.tsx` raiz (fontes, providers, next-intl), que o `error.tsx`
 * normal NÃO consegue capturar. Sem isso, um erro aí resulta em tela
 * branca sem nenhuma forma de recuperação.
 *
 * Precisa renderizar <html>/<body> própria (substitui o layout raiz) e
 * evitar depender de CSS/JS que talvez tenha falhado ao carregar.
 */
const GlobalError = ({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          backgroundColor: "#000",
          color: "#fff",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
          Algo deu errado
        </h1>
        <p style={{ color: "#a1a1aa", maxWidth: 360, margin: 0 }}>
          Ocorreu um erro inesperado ao carregar a página. Tente novamente.
        </p>
        <button
          onClick={() => reset()}
          style={{
            border: "1px solid #fb923c",
            color: "#fb923c",
            background: "transparent",
            borderRadius: "9999px",
            padding: "0.5rem 1.25rem",
            fontSize: "0.9rem",
            cursor: "pointer",
          }}
        >
          Tentar novamente
        </button>
        <button
          onClick={() => window.location.reload()}
          style={{
            border: "none",
            color: "#a1a1aa",
            background: "transparent",
            fontSize: "0.85rem",
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          Recarregar a página
        </button>
      </body>
    </html>
  );
};

export default GlobalError;
