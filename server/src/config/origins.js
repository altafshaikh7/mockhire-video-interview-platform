const LOCAL_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const VERCEL_PREVIEW_ORIGIN =
  /^https:\/\/mockhire-video-interview-platform-(?:[a-z0-9]+|git-[a-z0-9-]+)-altaf-shaikh2\.vercel\.app$/;

export function getAllowedOrigins() {
  const configuredOrigin = process.env.CLIENT_ORIGIN?.trim();
  return [...new Set([...LOCAL_ORIGINS, configuredOrigin].filter(Boolean))];
}

export function isAllowedOrigin(origin) {
  return (
    !origin ||
    getAllowedOrigins().includes(origin) ||
    VERCEL_PREVIEW_ORIGIN.test(origin)
  );
}
