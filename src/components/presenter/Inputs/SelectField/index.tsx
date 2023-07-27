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
  options: { value: string; label: string }[]
}

/**
 * SelectFieldの定義
 * @param {SelectFieldProps} props プロパティ
 */
export const SelectField: React.FC<SelectFieldProps> = (props) => {
  const { className, options } = props
  return (
    <select {...props} className={classNames(styles.select, className)}>
      {options.map((option, index) => (
        <option key={index} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
