import { GetServerSideProps } from "next";

function RobotsTxt() {}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /dashboard/
Disallow: /api/

Sitemap: https://pro-hai.com/sitemap.xml`;

  res.setHeader("Content-Type", "text/plain");
  res.write(robotsTxt);
  res.end();

  return { props: {} };
};

export default RobotsTxt;
