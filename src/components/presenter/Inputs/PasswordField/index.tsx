/**
 * パスワード形式の入力フィールド
 * @packageDocumentation
 */

import styles from './style.module.scss'
import classNames from 'classnames'
import React from 'react'
import Image from 'next/image'
import { InputHTMLAttributes } from 'react'

/**
 * PasswordFieldのプロパティ
 * @extends {InputHTMLAttributes<HTMLInputElement>}
 */
interface PasswordFieldProps extends InputHTMLAttributes<HTMLInputElement> {}

/**
 * PasswordFieldの定義
 * @param {PasswordFieldProps} props プロパティ
 */
export const PasswordField: React.FC<PasswordFieldProps> = (props) => {
  const { style, className } = props
  const [show, setShow] = React.useState(false)

  /**
   * 目マークのクリック時
   */
  const handleClick = React.useCallback(() => {
    setShow(!show)
  }, [show])

  return (
    <div style={style} className={classNames(styles.container, className)}>
      <input
        {...props}
        type={show ? 'text' : 'password'}
        className={styles.input}
        style={undefined} // styleは親divに当たるようにする
      />
      <div className={styles.icon} onClick={handleClick}>
        <img src='images/removeRedEye.svg' alt={''} width={24} height={24} />
      </div>
    </div>
  )
}
