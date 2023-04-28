import '../styles/style.scss'
import type { NextPage } from 'next'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { AuthProvider } from '../providers/AuthProvider'
import 'wdyr'
const App: NextPage<AppProps> = ({ Component, pageProps }) => {
  return (
    <>
      <Head>
        <meta charSet='UTF-8' />
        <meta httpEquiv='X-UA-Compatible' content='IE=edge' />
        <meta name='viewport' content='width=device-width, initial-scale=1.0' />
        <meta name='description' content='HorseManager' />

        <meta property='og:title' content='HorseManager' />
        <meta property='og:url' content='https://www.horsemanager.com' />
        <meta property='og:image' content='./images/hero-header.jpeg' />
        <meta property='og:type' content='website' />
        <meta property='og:site_name' content='HorseManager' />
        <meta name='twitter:card' content='summary_large_image' />

        <link rel='preconnect' href='https://fonts.googleapis.com' />
        <link
          rel='preconnect'
          href='https://fonts.gstatic.com'
          crossOrigin=''
        />
        <link rel='icon' href='./images/favicon.ico' />
        <title>HorseManager</title>
      </Head>
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </>
  )
}

export default App
