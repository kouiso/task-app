/**
 * ホーム画面
 * @packageDocumentation
 * /
 * @file
 */

import styles from './style.module.scss'
import { Auth } from 'components/container/Auth'

/**
 * Homeの定義
 */
const Home: React.FC = () => {
  return (
    <Auth>
      <div className={styles.container}>
        <div className={styles.left}></div>
        <div className={styles.right}>
          <div className={styles.header}></div>
        </div>
      </div>
    </Auth>
  )
}

export default Home
