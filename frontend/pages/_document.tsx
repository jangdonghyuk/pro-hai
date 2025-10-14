import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        {/* 네이버 */}
        <meta
          name="naver-site-verification"
          content="f7f94e53380f95bc35418e8ad3aa4fa3d177028f"
        />

        {/* 구글 */}
        <meta
          name="google-site-verification"
          content="LKgWfW15n0Hd0KgGED1EqmP2Q9hlWK1ejjE_JTNwHjE"
        />

        {/* 파비콘 */}
        <link rel="icon" href="/favicon.ico" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
