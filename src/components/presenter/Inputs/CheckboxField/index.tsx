/**
 * チェックボックス形式の入力フィールド
 * @packageDocumentation
 */

import styles from './style.module.scss'
import classNames from 'classnames'
import { InputHTMLAttributes } from 'react'

/**
 * CheckboxFieldのプロパティ
 * @extends {InputHTMLAttributes<HTMLInputElement>}
 */
interface CheckboxFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string // ラベル
}

/**
 * CheckboxFieldの定義
 * @param {CheckboxFieldProps} props プロパティ
 */
export const CheckboxField: React.FC<CheckboxFieldProps> = (props) => {
  const { className, id = 'checkbox', label = '' } = props
  return (
    <div className={className}>
      <input type='checkbox' id={id} className={styles.input} />
      <label htmlFor={id} className={classNames(styles.label, className)}>
        {label}
      </label>
    </div>
  )
}
