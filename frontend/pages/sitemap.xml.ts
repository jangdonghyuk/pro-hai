import { GetServerSideProps } from "next";

function SiteMap() {}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  // SEO로 노출시키고 싶은 페이지만 수동으로 관리
  const publicPages = [
    {
      url: "https://pro-hai.com",
      priority: "1.00",
    },
    // 나중에 추가할 페이지들
    // {
    //   url: 'https://pro-hai.com/about',
    //   priority: '0.80'
    // },
    // {
    //   url: 'https://pro-hai.com/pricing',
    //   priority: '0.80'
    // }
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${publicPages
  .map(
    (page) => `  <url>
    <loc>${page.url}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  res.setHeader("Content-Type", "text/xml");
  res.write(sitemap);
  res.end();

  return { props: {} };
};

export default SiteMap;
