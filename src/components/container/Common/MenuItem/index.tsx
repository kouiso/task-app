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
  id: string // メニューID
  label: string // ラベル
  icon: string // アイコン
  isExpand?: boolean // サブメニューの展開フラグ
  selectedSubId?: string //選択中のサブメニューID
  // サブメニュー一覧
  subMenus?: {
    id: string // サブメニューID
    title: string // タイトル
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
    selectedSubId,
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
          {subMenus.map((sub, index) => {
            return (
              <div
                key={index}
                className={classNames(
                  styles.subMenu,
                  sub.id === selectedSubId && styles.subMenu_select,
                )}
                onClick={() => handleClickSubMenu?.(sub.id)}
              >
                <label>{sub.title}</label>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
