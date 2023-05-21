/**
 * 画面共通：メニューバー
 * @packageDocumentation
 */

import styles from './style.module.scss'
import React from 'react'
import { MenuItem } from 'components/container/Common/MenuItem'

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
   * メニューの定義
   */
  const menus = React.useMemo(
    () => [
      {
        id: 'account',
        label: 'アカウント',
        icon: 'images/account.svg',
        isExpand: selectedMenuId === 'account',
        subMenus: [
          {
            subId: 'accountInfo',
            title: 'アカウント情報',
            isSelect: selectedSubMenuId === 'accountInfo',
          },
          {
            subId: 'stableInfo',
            title: '厩舎情報',
            isSelect: selectedSubMenuId === 'stableInfo',
          },
          {
            subId: 'horseInfo',
            title: '馬匹情報',
            isSelect: selectedSubMenuId === 'horseInfo',
          },
        ],
      },
      {
        id: 'record',
        label: '記録',
        icon: 'images/record.svg',
        isExpand: selectedMenuId === 'record',
        subMenus: [
          {
            subId: 'waterIntakesRecord',
            title: '飲水量記録',
            isSelect: selectedSubMenuId === 'waterIntakesRecord',
          },
          {
            subId: 'feedIntakesRecord',
            title: '給餌量記録',
            isSelect: selectedSubMenuId === 'feedIntakesRecord',
          },
          {
            subId: 'exercisesRecord',
            title: '運動量記録',
            isSelect: selectedSubMenuId === 'exercisesRecord',
          },
        ],
      },
      {
        id: 'regist',
        label: '登録',
        icon: 'images/regist.svg',
        isExpand: selectedMenuId === 'regist',
        subMenus: [
          {
            subId: 'horseRegist',
            title: '馬匹登録',
            isSelect: selectedSubMenuId === 'horseRegist',
          },
          {
            subId: 'feedsRegist',
            title: '餌登録',
            isSelect: selectedSubMenuId === 'feedsRegist',
          },
          {
            subId: 'workerRegist',
            title: '従業員登録',
            isSelect: selectedSubMenuId === 'workerRegist',
          },
        ],
      },
      {
        id: 'other',
        label: 'その他',
        icon: 'images/board.svg',
        isExpand: selectedMenuId === 'other',
        subMenus: [
          {
            subId: 'calendar',
            title: 'カレンダー',
            isSelect: selectedSubMenuId === 'calendar',
          },
          {
            subId: 'board',
            title: 'ボード',
            isSelect: selectedSubMenuId === 'board',
          },
          {
            subId: 'other',
            title: 'その他',
            isSelect: selectedSubMenuId === 'other',
          },
        ],
      },
    ],
    [selectedMenuId, selectedSubMenuId],
  )

  /**
   * メニューのクリック時
   */
  const handleClickMenu = React.useCallback(
    (id: string) => {
      setSelectedMenuId(id !== selectedMenuId ? id : '')
    },
    [selectedMenuId],
  )

  /**
   * サブメニューのクリック時
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
            onClickMenu={handleClickMenu}
            onClickSubMenu={handleClickSubMenu}
          />
        )
      })}
    </div>
  )
}
