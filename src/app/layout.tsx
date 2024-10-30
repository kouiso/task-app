import Header from './components/Header';
import Sidebar from './components/Sidebar';
import styles from './layout.module.scss';
import './styles/main.scss';

type LayoutProps = {
  children: React.ReactNode;
};

export const metadata = {
  title: 'HorseManager',
};

const RootLayout = ({ children }: LayoutProps) => (
  <html lang="ja">
    <head />
    <body>
      <Header />
      <div className={styles.layout}>
        <Sidebar />
        <div>{children}</div>
      </div>
    </body>
  </html>
);

export default RootLayout;
