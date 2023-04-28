/**
 * テキスト形式のリンク
 * @packageDocumentation
 */

import style from './style.module.scss'
import classNames from 'classnames'
import { AnchorHTMLAttributes } from 'react'

/**
 * TextLinkのプロパティ
 * @extends {AnchorHTMLAttributes<HTMLAnchorElement>}
 */
interface TextLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  label?: string // ラベル
}

/**
 * TextLinkの定義
 * @param {TextLinkProps} props プロパティ
 */
export const TextLink: React.FC<TextLinkProps> = (props) => {
  const { className, label = '' } = props
  return (
    <a {...props} className={classNames(style.label, className)}>
      {label}
    </a>
  )
}
