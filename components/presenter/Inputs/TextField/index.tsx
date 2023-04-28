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
interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {}

/**
 * TextFieldの定義
 * @param {TextFieldProps} props プロパティ
 */
export const TextField: React.FC<TextFieldProps> = (props) => {
  const { className } = props
  return (
    <input
      {...props}
      type='text'
      className={classNames(styles.input, className)}
    />
  )
}
