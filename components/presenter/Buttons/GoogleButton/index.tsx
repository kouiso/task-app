/**
 * Googleボタン
 * @packageDocumentation
 */

import styles from './style.module.scss'
import classNames from 'classnames'
import { ButtonHTMLAttributes } from 'react'

/**
 * GoogleButtonのプロパティ
 * @extends {ButtonHTMLAttributes<HTMLButtonElement>}
 */
interface GoogleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {}

/**
 * GoogleButtonの定義
 * @param {GoogleButtonProps} props プロパティ
 */
export const GoogleButton: React.FC<GoogleButtonProps> = (props) => {
  const { className, children = 'Googleでログイン' } = props
  return (
    <button {...props} className={classNames(styles.button, className)}>
      <img src='images/google.svg' alt={''} width={24} height={24} />
      <span className={styles.caption}>{children}</span>
    </button>
  )
}
