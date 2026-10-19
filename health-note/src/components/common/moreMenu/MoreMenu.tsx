import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';

import styles from './MoreMenu.module.scss';

import { MdMoreVert } from 'react-icons/md';

type TMoreMenuItem = {
  label: string;
  color?: 'rose';
} & ({ to: string; onClick?: never } | { to?: never; onClick: () => void });

type TMoreMenuProps = { items: TMoreMenuItem[] };

export default function MoreMenu({ items }: TMoreMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!isOpen) return;
    rootRef.current?.querySelector<HTMLElement>('[data-menu-item]')?.focus();

    function handleOutsideClick(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, [isOpen]);

  function closeMenu() {
    setIsOpen(false);
    buttonRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (!isOpen) {
      setIsOpen(true);
      return;
    }
    const elements = Array.from(
      rootRef.current?.querySelectorAll<HTMLElement>('[data-menu-item]') ?? [],
    );
    const current = elements.indexOf(document.activeElement as HTMLElement);
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? elements.length - 1
          : (current + (event.key === 'ArrowUp' ? -1 : 1) + elements.length) % elements.length;
    elements[next]?.focus();
  }

  return (
    <div
      ref={rootRef}
      className={styles['more-menu']}
      onKeyDown={handleKeyDown}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className={styles['trigger']}
        aria-label="더보기"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => setIsOpen(!isOpen)}
      >
        <MdMoreVert size={24} aria-hidden="true" />
      </button>
      {isOpen && (
        <div id={menuId} className={styles['menu']}>
          {items.map((item) => {
            const className = `${styles['item']} ${item.color ? styles[`color-${item.color}`] : ''}`;
            return item.to !== undefined ? (
              <Link
                key={item.label}
                to={item.to}
                className={className}
                data-menu-item
                onClick={closeMenu}
              >
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                className={className}
                data-menu-item
                onClick={() => {
                  closeMenu();
                  item.onClick();
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
