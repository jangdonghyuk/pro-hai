export const PUBLIC_API_URL =
  process.env.NODE_ENV === "production"
    ? "https://api.pro-hai.com"
    : "http://localhost:3001";
