/**
 * コンボボックス
 * @packageDocumentation
 */

import styles from './style.module.scss'
import classNames from 'classnames'
import { SelectHTMLAttributes } from 'react'

/**
 * SelectFieldのプロパティ
 * @extends {SelectHTMLAttributes<HTMLSelectElement>}
 */
interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}

/**
 * SelectFieldの定義
 * @param {SelectFieldProps} props プロパティ
 */
export const SelectField: React.FC<SelectFieldProps> = (props) => {
  const { className, options, id, label, placeholder } = props
  return (
    <div className={classNames(styles.container, className)}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <select id={id} {...props} className={styles.select}>
        <option
          value=''
          disabled
          selected
          hidden
          className={styles.placeholder}
        >
          {placeholder}
        </option>
        {options.map((option, index) => (
          <option key={index} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
