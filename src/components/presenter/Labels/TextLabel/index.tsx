/**
 * テキスト形式のラベル
 * @packageDocumentation
 */

import style from './style.module.scss'
import classNames from 'classnames'
import { HTMLAttributes } from 'react'

/**
 * TextLabelのプロパティ
 * @extends {HTMLAttributes<HTMLSpanElement>}
 */
interface TextLabelProps extends HTMLAttributes<HTMLSpanElement> {
  label?: string // ラベル
}

/**
 * TextLabelの定義
 * @param {TextLabelProps} props プロパティ
 */
export const TextLabel: React.FC<TextLabelProps> = (props) => {
  const { className, label = '' } = props
  return (
    <span {...props} className={classNames(style.label, className)}>
      {label}
    </span>
  )
}
