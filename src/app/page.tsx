import Image from 'next/image';

import styles from './page.module.scss';

const Home = () => (
  <div className={styles.page}>
    <main>
      <Image
        className={styles.logo}
        src="https://nextjs.org/icons/next.svg"
        alt="Next.js logo"
        width={180}
        height={38}
        priority
      />
    </main>
  </div>
);

export default Home;
