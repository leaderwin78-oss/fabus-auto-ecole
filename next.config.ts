import type { NextConfig } from "next";

// Vercel fournit déjà HSTS et la redirection HTTP -> HTTPS. Le reste manquait :
// sans X-Frame-Options le site est encadrable dans une iframe (clickjacking :
// un site tiers superpose son interface au-dessus de la nôtre et fait cliquer
// l'utilisateur sur nos vrais boutons), et sans X-Content-Type-Options le
// navigateur devine le type des fichiers servis au lieu de faire confiance à
// l'en-tête.
const securityHeaders = [
  // Personne ne doit pouvoir encadrer l'application.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Ne pas fuiter le chemin complet des pages vers les sites externes liés.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Aucune de ces API n'est utilisée par l'application.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  {
    // 'unsafe-inline' pour les styles est requis par les styles en ligne de
    // React ; il l'est aussi pour les scripts tant que le script anti-flash de
    // thème dans layout.tsx n'a pas de nonce. connect-src autorise Supabase
    // (base, auth, storage) et rien d'autre.
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // meet.jit.si : la salle de cours en visioconférence charge son script
      // externe et s'affiche dans une iframe (voir app/cours/[appointmentId]).
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://meet.jit.si",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
      "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:",
      "img-src 'self' data: blob: https://*.supabase.co https://meet.jit.si",
      "media-src 'self' blob: https://*.supabase.co",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://meet.jit.si wss://meet.jit.si",
      "frame-src 'self' https://meet.jit.si",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
