import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sin el indicador "N" en desarrollo (estorbaba en capturas y demos).
  devIndicators: false,
  // Sin cacheComponents: casi todas las páginas leen la base en cada petición
  // (chat del alumno, panel del maestro), así que el render dinámico clásico
  // es más simple y no exige envolver cada lectura en <Suspense>.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
