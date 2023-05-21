/**
 * テキスト形式のラベル
 * @packageDocumentation
 */

import styles from './style.module.scss'
import classNames from 'classnames'
import React from 'react'

const ICON_SIZE = 24

/**
 * MenuItemのプロパティ
 * @extends {HTMLAttributes<HTMLSpanElement>}
 */
interface MenuItemProps {
  id: string // ID
  label: string // ラベル
  icon: string // アイコン
  isExpand?: boolean // サブメニューの展開フラグ
  // サブメニュー一覧
  subMenus?: {
    subId: string // サブメニューID
    title: string // タイトル
    isSelect?: boolean // 選択中か
  }[]
  onClickMenu?(id: string): void // メニューのクリック
  onClickSubMenu?(id: string): void // サブメニューのクリック
}

/**
 * MenuItemの定義
 * @param {MenuItemProps} props プロパティ
 */
export const MenuItem: React.FC<MenuItemProps> = (props) => {
  const {
    id,
    label = '',
    icon = '',
    isExpand = false,
    subMenus = [],
    onClickMenu,
    onClickSubMenu,
  } = props

  /**
   * メニューのクリック時
   */
  const handleClickMenu = React.useCallback(() => {
    onClickMenu?.(id)
  }, [id, onClickMenu])

  /**
   * サブメニューのクリック時
   */
  const handleClickSubMenu = React.useCallback(
    (subId: string) => {
      onClickSubMenu?.(subId)
    },
    [onClickSubMenu],
  )

  return (
    <>
      <div
        className={classNames(
          styles.container,
          isExpand && styles.container_expand,
        )}
        onClick={handleClickMenu}
      >
        {/* アイコン */}
        <img
          className={classNames(styles.icon, isExpand && styles.icon_expand)}
          src={icon}
          alt={''}
          width={ICON_SIZE}
          height={ICON_SIZE}
        />
        {/* ラベル */}
        <p className={styles.label}>{label}</p>
        {/* 矢印 */}
        <img
          className={classNames(styles.arrow, isExpand && styles.arrow_expand)}
          src='images/arrow.svg'
          alt={''}
          width={ICON_SIZE}
          height={ICON_SIZE}
        />
      </div>
      {/* サブメニュー */}
      {isExpand && (
        <div className={styles.subContainer}>
          {subMenus.map((m, index) => {
            return (
              <div
                key={index}
                className={classNames(
                  styles.subMenu,
                  m.isSelect && styles.subMenu_select,
                )}
                onClick={() => handleClickSubMenu?.(m.subId)}
              >
                <label>{m.title}</label>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
