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
import FeedRegistPage from './feedRegist'
import HorseRegistPage from './horseRegist'
import WaterRecordPage from './waterRecord'

/**
 * Homeの定義
 */
const Home: React.FC = () => {
  const kind: number = 3
  return (
    <Auth>
      <div className={styles.container}>
        <div className={styles.left}>
          <MenuBar />
        </div>
        <div className={styles.right}>
          <div className={styles.header}>
            <TopBar />
            {kind === 1 && <HorseRegistPage />}
            {kind === 2 && <FeedRegistPage />}
            {kind === 3 && <WaterRecordPage />}
          </div>
        </div>
      </div>
    </Auth>
  )
}

export default Home
