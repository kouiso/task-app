/**
 * コンボボックスコンポーネントを定義します。
 * @packageDocumentation
 */

import styles from './style.module.scss'
import classNames from 'classnames'
import { SelectHTMLAttributes } from 'react'

/**
 * `SelectField` コンポーネントのプロパティを定義します。
 *
 * @extends {SelectHTMLAttributes<HTMLSelectElement>} HTMLSelectElementからの属性を継承します。
 * @property {string} [label] - セレクトフィールドのラベル。
 * @property {{ value: string; label: string }[]} options - セレクトフィールドのオプション配列。
 * @property {string} [placeholder] - セレクトフィールドのプレースホルダー。
 */
interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

/**
 * `SelectField` コンポーネントを定義します。
 *
 * @param {SelectFieldProps} props - `SelectField` コンポーネントのプロパティ。
 * @returns {React.FC<SelectFieldProps>} レンダリングされたセレクトフィールドコンポーネント。
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
