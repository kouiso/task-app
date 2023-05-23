/**
 * プロフィールボタン
 * @packageDocumentation
 */

import styles from './style.module.scss'
import classNames from 'classnames'

/**
 * ProfileButtonのプロパティ
 */
interface ProfileButtonProps {
  userName?: string // ユーザ名
  attr1?: string // 属性1 (暫定)
  attr2?: string // 属性2 (暫定)
  className?: string // クラス名
}

/**
 * ProfileButtonの定義
 * @param {ProfileButtonProps} props プロパティ
 */
export const ProfileButton: React.FC<ProfileButtonProps> = (props) => {
  const { userName, attr1, attr2, className } = props
  return (
    <div className={classNames(styles.container, className)}>
      <img
        className={styles.icon}
        src='images/profile.svg'
        alt={''}
        width={44}
        height={44}
      />
      <div className={styles.labels}>
        <div className={styles.userName}>{userName}</div>
        <div>{attr1}</div>
        <div>{attr2}</div>
      </div>
      <img
        className={styles.icon}
        src='images/arrow.svg'
        alt={''}
        width={24}
        height={24}
      />
    </div>
  )
}
