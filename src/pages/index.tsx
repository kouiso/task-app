/**
 * ホーム画面
 * @packageDocumentation
 * /
 * @file
 */

import styles from './style.module.scss'
import { Auth } from 'components/container/Auth'
import { MenuBar } from 'components/container/Common/MenuBar'

/**
 * Homeの定義
 */
const Home: React.FC = () => {
  return (
    <Auth>
      <div className={styles.container}>
        <div className={styles.left}>
          <MenuBar />
        </div>
        <div className={styles.right}>
          <div className={styles.header}></div>
        </div>
      </div>
    </Auth>
  )
}

export default Home
