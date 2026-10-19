import { Link } from 'react-router-dom'
import type { ComponentProps } from 'react'

import type { TButtonColor, TButtonFill } from './Button'

import styles from './Button.module.scss'

type TButtonLinkProps = ComponentProps<typeof Link> & {
  color?: TButtonColor
  fill?: TButtonFill
}

export default function ButtonLink({ color = 'mint', fill = 'solid', className = '', ...props }: TButtonLinkProps) {
  return <Link {...props} className={`${styles['button']} ${styles[`color-${color}`]} ${styles[`fill-${fill}`]} ${className}`} />
}
