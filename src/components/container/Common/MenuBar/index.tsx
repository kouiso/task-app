/**
 * 画面共通：メニューバー
 * @packageDocumentation
 */

import styles from './style.module.scss'
import words from 'words/default'
import React from 'react'
import { MenuItem } from 'components/container/Common/MenuItem'

/**
 * メニューの定義
 */
const menus = [
  // アカウント
  {
    id: 'account',
    label: words.account,
    icon: 'images/account.svg',
    subMenus: [
      {
        id: 'accountInfo',
        title: `${words.account}${words.info}`,
      },
      {
        id: 'stableInfo',
        title: `${words.stable}${words.info}`,
      },
      {
        id: 'horseInfo',
        title: `${words.horse}${words.info}`,
      },
    ],
  },
  // 記録
  {
    id: 'record',
    label: words.record,
    icon: 'images/record.svg',
    subMenus: [
      {
        id: 'waterIntakesRecord',
        title: `${words.waterIntakes}${words.record}`,
      },
      {
        id: 'feedIntakesRecord',
        title: `${words.feedIntakes}${words.record}`,
      },
      {
        id: 'exercisesRecord',
        title: `${words.exercises}${words.record}`,
      },
    ],
  },
  // 登録
  {
    id: 'regist',
    label: words.regist,
    icon: 'images/regist.svg',
    subMenus: [
      {
        id: 'horseRegist',
        title: `${words.horse}${words.regist}`,
      },
      {
        id: 'feedsRegist',
        title: `${words.feed}${words.regist}`,
      },
      {
        id: 'workerRegist',
        title: `${words.worker}${words.regist}`,
      },
    ],
  },
  // その他
  {
    id: 'other',
    label: words.other,
    icon: 'images/board.svg',
    subMenus: [
      {
        id: 'calendar',
        title: words.calendar,
      },
      {
        id: 'board',
        title: words.board,
      },
      {
        id: 'other',
        title: words.other,
      },
    ],
  },
]

/**
 * MenuBarのプロパティ
 */
interface MenuBarProps {
  // 未定
}

/**
 * MenuBarの定義
 * @param {MenuBarProps} props プロパティ
 */
export const MenuBar: React.FC<MenuBarProps> = (props) => {
  const [selectedMenuId, setSelectedMenuId] = React.useState('')
  const [selectedSubMenuId, setSelectedSubMenuId] = React.useState('')

  /**
   * メニューのクリック時
   * @param {string} id メニューID
   */
  const handleClickMenu = React.useCallback(
    (id: string) => {
      setSelectedMenuId(id !== selectedMenuId ? id : '')
    },
    [selectedMenuId],
  )

  /**
   * サブメニューのクリック時
   * @param {string} subId サブメニューID
   */
  const handleClickSubMenu = React.useCallback((subId: string) => {
    setSelectedSubMenuId(subId)
  }, [])

  return (
    <div className={styles.container}>
      {menus.map((m, index) => {
        return (
          <MenuItem
            {...m}
            key={index}
            isExpand={m.id === selectedMenuId}
            selectedSubId={selectedSubMenuId}
            onClickMenu={handleClickMenu}
            onClickSubMenu={handleClickSubMenu}
          />
        )
      })}
    </div>
  )
}
