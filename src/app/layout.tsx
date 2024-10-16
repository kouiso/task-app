import type { ReactNode } from 'react';

import styles from './_layout.module.scss';
import Header from './components/Header/Header';
import Sidebar from './components/Sidebar/Sidebar';
import './styles/main.scss';

interface LayoutProps {
  children: ReactNode;
}

export const metadata = {
  title: 'HorseManager',
};

const RootLayout = ({ children }: LayoutProps) => (
  <div className={styles.layout}>
    <Header />
    <Sidebar />
    <main>{children}</main>
  </div>
);

export default RootLayout;
