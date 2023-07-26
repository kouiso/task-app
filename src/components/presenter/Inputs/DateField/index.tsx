/**
 * テキスト形式の入力フィールド
 * @packageDocumentation
 */

import styles from './style.module.scss'
import classNames from 'classnames'
import { InputHTMLAttributes } from 'react'

/**
 * TextFieldのプロパティ
 * @extends {InputHTMLAttributes<HTMLInputElement>}
 */
interface DateFieldProps extends InputHTMLAttributes<HTMLInputElement> {}

/**
 * TextFieldの定義
 * @param {TextFieldProps} props プロパティ
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
