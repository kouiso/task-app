/**
 * ボタン
 * @packageDocumentation
 */

import styles from './style.module.scss'
import classNames from 'classnames'
import { ButtonHTMLAttributes } from 'react'

/**
 * Buttonのプロパティ
 * @extends {ButtonHTMLAttributes<HTMLButtonElement>}
 */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string // ラベル
}

/**
 * Buttonの定義
 * @param {ButtonProps} props プロパティ
 */
export const Button: React.FC<ButtonProps> = (props) => {
  const { className, children, label = '' } = props
  return (
    <button {...props} className={classNames(styles.button, className)}>
      {children || label}
    </button>
  )
}
