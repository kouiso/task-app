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
interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

/**
 * TextFieldの定義
 * @param {TextFieldProps} props プロパティ
 */
export const TextField: React.FC<TextFieldProps> = (props) => {
  const { className, id, label } = props
  return (
    <div className={classNames(styles.container, className)}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input id={id} {...props} type='text' className={styles.input} />
    </div>
  )
}
