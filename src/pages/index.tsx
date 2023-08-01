/**
 * ホーム画面
 * @packageDocumentation
 * /
 * @file
 */

import styles from './style.module.scss'
import { Auth } from 'components/container/Auth'
import { MenuBar } from 'components/container/Common/MenuBar'
import { TopBar } from 'components/container/Common/TopBar'
import HorseRegistPage from './horseRegist'

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
          <div className={styles.header}>
            <TopBar />
            <HorseRegistPage />
          </div>
        </div>
      </div>
    </Auth>
  )
}

export default Home
