import Header from './components/header';
import Sidebar from './components/sidebar';
import styles from './layout.module.scss';
import './styles/main.scss';

type LayoutProps = {
  children: React.ReactNode;
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
