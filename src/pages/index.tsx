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
      <h1 className={styles.title}>ようこそ、ホーム画面へ</h1>
    </Auth>
  )
}

export default Home
