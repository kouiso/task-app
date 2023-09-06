/**
 * Datetime形式の入力フィールド
 * @packageDocumentation
 */

import styles from './style.module.scss'
import classNames from 'classnames'
import { InputHTMLAttributes } from 'react'

/**
 * DatetimeFieldのプロパティ
 * @extends {InputHTMLAttributes<HTMLInputElement>}
 */
interface DatetimeFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

/**
 * DatetimeFieldの定義
 * @param {DatetimeFieldProps} props プロパティ
 */
export const DatetimeField: React.FC<DatetimeFieldProps> = (props) => {
  const { className, id, label } = props
  return (
    <div className={classNames(styles.container, className)}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        {...props}
        type='datetime-local'
        className={styles.input}
      />
    </div>
  )
}
