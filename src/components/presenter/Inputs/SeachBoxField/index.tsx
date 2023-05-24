/**
 * 検索のテキストフィールド
 * @packageDocumentation
 */

import styles from './style.module.scss'
import classNames from 'classnames'
import { InputHTMLAttributes } from 'react'

/**
 * SeachBoxFieldのプロパティ
 * @extends {InputHTMLAttributes<HTMLInputElement>}
 */
interface SeachBoxFieldProps extends InputHTMLAttributes<HTMLInputElement> {}

/**
 * SeachBoxFieldの定義
 * @param {SeachBoxFieldProps} props プロパティ
 */
export const SeachBoxField: React.FC<SeachBoxFieldProps> = (props) => {
  const { className, placeholder = 'Seach...' } = props
  return (
    <div className={classNames(styles.container, className)}>
      <input
        {...props}
        type='text'
        className={classNames(styles.input)}
        placeholder={placeholder}
      />
      <img
        className={styles.icon}
        src='images/search.svg'
        alt={''}
        width={24}
        height={24}
      />
    </div>
  )
}
