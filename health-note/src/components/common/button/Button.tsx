import type { ComponentProps } from 'react'

import styles from './Button.module.scss'

export type TButtonColor = 'mint' | 'gray' | 'rose'
export type TButtonFill = 'solid' | 'outline'

type TButtonProps = ComponentProps<'button'> & {
  color?: TButtonColor
  fill?: TButtonFill
}

export default function Button({ type = 'button', color = 'mint', fill = 'solid', className = '', ...props }: TButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={`${styles['button']} ${styles[`color-${color}`]} ${styles[`fill-${fill}`]} ${className}`}
    />
  )
}
