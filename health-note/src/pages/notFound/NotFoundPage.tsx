import ButtonLink from '@/components/common/button/ButtonLink'

import styles from './NotFoundPage.module.scss'

export default function NotFoundPage() {
  return (
    <div className={styles['not-found']}>
      <h1>페이지를 찾을 수 없어요.</h1>
      <ButtonLink to="/">메인으로</ButtonLink>
    </div>
  )
}
