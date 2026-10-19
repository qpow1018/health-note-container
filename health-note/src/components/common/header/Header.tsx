import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { To } from 'react-router-dom'

import styles from './Header.module.scss'

import { MdArrowBack } from 'react-icons/md'

type THeaderProps = {
  title: string
  showBack?: boolean
  fallbackTo?: To
  backTo?: To
  onBack?: () => void
  actions?: ReactNode
}

export default function Header({ title, showBack = true, fallbackTo = '/', backTo, onBack, actions }: THeaderProps) {
  const navigate = useNavigate()

  function handleBack() {
    if (onBack) {
      onBack()
      return
    }
    if (backTo !== undefined) {
      navigate(backTo)
      return
    }

    // BrowserRouter는 최초 진입을 0으로 두고 앱 내 이동에 idx를 증가시킨다.
    // 전체 브라우저 history.length 대신 앱 라우터의 이동 이력을 확인한다.
    const historyIndex: unknown = window.history.state?.idx
    if (typeof historyIndex === 'number' && historyIndex > 0) {
      navigate(-1)
      return
    }
    navigate(fallbackTo, { replace: true })
  }

  return (
    <header className={styles['header']}>
      {showBack && (
        <button className={styles['back-button']} type="button" onClick={handleBack} aria-label="뒤로가기">
          <MdArrowBack size={20} aria-hidden="true" />
        </button>
      )}
      <h1 className={styles['title']} title={title}>{title}</h1>
      {actions && <div className={styles['actions']}>{actions}</div>}
    </header>
  )
}
