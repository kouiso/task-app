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
interface DateFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

/**
 * DateFieldの定義
 * @param {DateFieldProps} props プロパティ
 */
export const DateField: React.FC<DateFieldProps> = (props) => {
  const { className, id, label } = props
  return (
    <div className={classNames(styles.container, className)}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input id={id} {...props} type='date' className={styles.input} />
    </div>
  )
}
