import { expect, test } from './authFixture';

for (const firstClosed of ['modal', 'sheet']) {
  test(`겹친 창에서 ${firstClosed}을 먼저 닫아도 마지막 창까지 스크롤을 잠근다`, async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate(() => {
      document.body.style.overflow = 'scroll';
    });
    const entry = await (await page.request.get('/src/main.tsx')).text();
    const reactUrl = entry.match(/from "([^"]*\/react\.js[^"]*)"/)![1];
    const reactDomUrl = entry.match(/from "([^"]*\/react-dom_client\.js[^"]*)"/)![1];
    // 실제 공용 컴포넌트를 별도 React 루트에 구성해 닫히는 순서를 제어한다.
    await page.addScriptTag({
      type: 'module',
      content: `
        import React from ${JSON.stringify(reactUrl)};
        import ReactDOM from ${JSON.stringify(reactDomUrl)};
        import Modal from '/src/components/common/modal/Modal.tsx';
        import Confirm from '/src/components/common/modal/Confirm.tsx';
        import BottomSheet from '/src/components/common/modal/BottomSheet.tsx';
        const host = document.createElement('div');
        document.body.append(host);
        const root = ReactDOM.createRoot(host);
        function Harness() {
          const [modal, setModal] = React.useState(true);
          const [sheet, setSheet] = React.useState(true);
          return React.createElement(React.Fragment, null,
            React.createElement(${firstClosed === 'modal' ? 'Modal' : 'Confirm'}, { isOpen: modal, title: '테스트 모달', message: '확인', confirmLabel: '확인', onConfirm() {}, onClose: () => setModal(false) }, '내용'),
            React.createElement(BottomSheet, { isOpen: sheet, title: '테스트 시트', onClose: () => setSheet(false) }, '내용'),
            React.createElement('button', { id: 'close-modal', onClick: () => setModal(false) }, '모달 닫기'),
            React.createElement('button', { id: 'close-sheet', onClick: () => setSheet(false) }, '시트 닫기'),
            React.createElement('button', { id: 'open-both', onClick: () => { setModal(true); setSheet(true); } }, '다시 열기'),
            React.createElement('button', { id: 'unmount-lock-test', onClick: () => root.unmount() }, '제거')
          );
        }
        root.render(React.createElement(React.StrictMode, null, React.createElement(Harness)));
      `,
    });
    await expect(page.locator('dialog[open]')).toHaveCount(2);
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
    // 아래쪽 dialog도 닫힐 수 있는 상태 변경을 재현한다.
    await page
      .locator(`#close-${firstClosed}`)
      .evaluate((button: HTMLButtonElement) => button.click());
    await expect(page.locator('dialog[open]')).toHaveCount(1);
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
    if (firstClosed === 'modal') {
      await page
        .getByRole('dialog', { name: '테스트 시트' })
        .getByRole('button', { name: '닫기' })
        .click();
    } else {
      await page.keyboard.press('Escape');
    }
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await expect(page.locator('body')).toHaveCSS('overflow', 'scroll');
    await page.locator('#open-both').evaluate((button: HTMLButtonElement) => button.click());
    await expect(page.locator('dialog[open]')).toHaveCount(2);
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
    await page
      .locator('#unmount-lock-test')
      .evaluate((button: HTMLButtonElement) => button.click());
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await expect(page.locator('body')).toHaveCSS('overflow', 'scroll');
  });
}
