/**
 * アイコンボタン
 * @packageDocumentation
 */

import styles from './style.module.scss'
import classNames from 'classnames'
import { ImgHTMLAttributes } from 'react'

/**
 * IconButtonのプロパティ
 */
interface IconButtonProps extends ImgHTMLAttributes<HTMLImageElement> {
  size?: number // サイズ
}

/**
 * IconButtonの定義
 * @param {IconButtonProps} props プロパティ
 */
export const IconButton: React.FC<IconButtonProps> = (props) => {
  const { className, src, size = 24 } = props
  return (
    <img
      {...props}
      className={classNames(styles.img, className)}
      src={src}
      alt={''}
      width={size}
      height={size}
    />
  )
}
