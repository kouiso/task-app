/**
 * Date形式の入力フィールド
 * @packageDocumentation
 */

import styles from './style.module.scss'
import classNames from 'classnames'
import { InputHTMLAttributes } from 'react'

/**
 * DateFieldのプロパティ
 * @extends {InputHTMLAttributes<HTMLInputElement>}
 */
interface DateFieldProps extends InputHTMLAttributes<HTMLInputElement> {}

/**
 * DateFieldの定義
 * @param {DateFieldProps} props プロパティ
 */
export const DateField: React.FC<DateFieldProps> = (props) => {
  const { className } = props
  return (
    <input
      {...props}
      type='date'
      className={classNames(styles.input, className)}
    />
  )
}
