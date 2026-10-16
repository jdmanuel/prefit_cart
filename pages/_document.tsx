import Document, { DocumentContext, Head, Html, Main, NextScript } from 'next/document';
import { ServerStyleSheet } from 'styled-components';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';

// Mantine ships plain CSS. styled-components (layout and the "How we built this" drawer) is
// collected during SSR so the first paint is styled.
export default class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const sheet = new ServerStyleSheet();
    const originalRenderPage = ctx.renderPage;
    try {
      ctx.renderPage = () =>
        originalRenderPage({
          enhanceApp: App => props => sheet.collectStyles(<App {...props} />),
        });
      const initialProps = await Document.getInitialProps(ctx);
      return { ...initialProps, styles: [initialProps.styles, sheet.getStyleElement()] };
    } finally {
      sheet.seal();
    }
  }

  render() {
    return (
      <Html lang="en" {...mantineHtmlProps}>
        <Head>
          <ColorSchemeScript defaultColorScheme="light" />
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
