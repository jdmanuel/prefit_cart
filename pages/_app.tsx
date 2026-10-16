import '@mantine/core/styles.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { createGlobalStyle } from 'styled-components';
import { MantineProvider } from '@mantine/core';
import { BRAND, theme } from '@/components/ui';

const GlobalStyle = createGlobalStyle`
  body {
    background: #f6f5fa;
    color: ${BRAND.ink};
    -webkit-font-smoothing: antialiased;
  }
`;

export default function App({ Component, pageProps }: AppProps) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <Head>
        <title>Prefit Cart · an Acme signup tailored by Exa</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="A self-configuring signup: one Exa search turns a work email into a cited company profile, and plain rules turn that into a tailored plan."
        />
      </Head>
      <GlobalStyle />
      <Component {...pageProps} />
    </MantineProvider>
  );
}
