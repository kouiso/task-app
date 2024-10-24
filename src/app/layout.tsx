import Header from './components/Header/Header';
import Sidebar from './components/Sidebar/Sidebar';
import styles from './layout.module.scss';
import './styles/main.scss';

type LayoutProps = {
  children: React.ReactNode;
};

export const metadata = {
  title: 'HorseManager',
};

const RootLayout = ({ children }: LayoutProps) => (
  <html lang="ja" data-theme="dark">
    <head />
    <body>
      <Header />
      <div className={styles.layout}>
        <Sidebar />
        <main>{children}</main>
      </div>
    </body>
  </html>
);

export default RootLayout;
