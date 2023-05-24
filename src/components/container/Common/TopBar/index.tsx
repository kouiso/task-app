/**
 * 画面共通：トップバー
 * @packageDocumentation
 */

import styles from './style.module.scss'
import React from 'react'
import { SeachBoxField } from 'components/presenter/Inputs/SeachBoxField'
import { ProfileButton } from 'components/presenter/Buttons/ProfileButton'
import { IconButton } from 'components/presenter/Buttons/IconButton'

/**
 * TopBarのプロパティ
 */
interface TopBarProps {
  // 未定
}

/**
 * TopBarの定義
 * @param {TopBarProps} props プロパティ
 */
export const TopBar: React.FC<TopBarProps> = (props) => {
  return (
    <div className={styles.container}>
      <SeachBoxField className={styles.seachBox} />
      <IconButton className={styles.icon} src='images/share.svg' />
      <IconButton className={styles.icon} src='images/notification.svg' />
      <IconButton className={styles.icon} src='images/setting.svg' />
      <ProfileButton
        className={styles.profile}
        userName='Taro Yamada'
        attr1='Lead'
        attr2='Developer'
      />
    </div>
  )
}
