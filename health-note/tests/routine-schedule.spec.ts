import { expect, test } from '@playwright/test';
import {
  isRoutineScheduled,
  moveRoutineDate,
  isRoutineDate,
  getNextRoutineDate,
} from '../src/features/routine/routineSchedule';

test('요일 반복은 일요일과 복수 요일을 구분한다', () => {
  const schedule = { type: 'weekdays', days: [0, 3] } as const;
  expect(isRoutineScheduled({ ...schedule, days: [...schedule.days] }, '2026-10-14')).toBe(true);
  expect(isRoutineScheduled({ ...schedule, days: [...schedule.days] }, '2026-10-18')).toBe(true);
  expect(isRoutineScheduled({ ...schedule, days: [...schedule.days] }, '2026-10-19')).toBe(false);
});

test('간격 반복은 시작일 이전을 제외하고 월말·연말·윤년을 넘어서 계산한다', () => {
  const schedule = { type: 'interval', startDate: '2026-10-14', intervalDays: 2 } as const;
  for (const date of ['2026-10-14', '2026-10-16', '2026-10-18'])
    expect(isRoutineScheduled(schedule, date)).toBe(true);
  for (const date of ['2026-10-12', '2026-10-13', '2026-10-15'])
    expect(isRoutineScheduled(schedule, date)).toBe(false);
  expect(isRoutineScheduled({ ...schedule, startDate: '2026-12-31' }, '2027-01-02')).toBe(true);
  expect(isRoutineScheduled({ ...schedule, startDate: '2024-02-28' }, '2024-03-01')).toBe(true);
  expect(isRoutineScheduled({ ...schedule, intervalDays: 1 }, '2026-11-01')).toBe(true);
});

test('날짜 이동과 날짜 검증은 월말·윤일과 잘못된 날짜를 구분한다', () => {
  expect(moveRoutineDate('2026-12-31', 1)).toBe('2027-01-01');
  expect(moveRoutineDate('2024-03-01', -1)).toBe('2024-02-29');
  for (const date of ['', 'invalid', '2026-02-29', '2026-04-31', '0000-01-01'])
    expect(isRoutineDate(date)).toBe(false);
  for (const date of ['2024-02-29', '0001-01-01', '9999-12-31'])
    expect(isRoutineDate(date)).toBe(true);
});

test('미루기는 선택한 예정일 이후만 변경하고 여러 번 누적할 수 있다', () => {
  const schedule = {
    type: 'interval',
    startDate: '2026-10-14',
    intervalDays: 2,
    postponedDates: ['2026-10-18'],
  } as const;
  for (const date of ['2026-10-14', '2026-10-16', '2026-10-19', '2026-10-21']) {
    expect(
      isRoutineScheduled({ ...schedule, postponedDates: [...schedule.postponedDates] }, date),
    ).toBe(true);
  }
  for (const date of ['2026-10-18', '2026-10-20']) {
    expect(
      isRoutineScheduled({ ...schedule, postponedDates: [...schedule.postponedDates] }, date),
    ).toBe(false);
  }
  const repeated = { ...schedule, postponedDates: ['2026-10-18', '2026-10-19'] };
  expect(isRoutineScheduled(repeated, '2026-10-16')).toBe(true);
  expect(isRoutineScheduled(repeated, '2026-10-19')).toBe(false);
  expect(isRoutineScheduled(repeated, '2026-10-20')).toBe(true);
  expect(isRoutineScheduled(repeated, '2026-10-22')).toBe(true);
});

test('다음 예정일은 오늘·미래 시작일·미루기 내역을 반영한다', () => {
  const schedule = { type: 'interval', startDate: '2026-10-14', intervalDays: 2 } as const;
  expect(getNextRoutineDate(schedule, '2026-10-13')).toBe('2026-10-14');
  expect(getNextRoutineDate(schedule, '2026-10-14')).toBe('2026-10-14');
  expect(getNextRoutineDate(schedule, '2026-10-15')).toBe('2026-10-16');
  expect(getNextRoutineDate({ ...schedule, postponedDates: ['2026-10-18'] }, '2026-10-14')).toBe(
    '2026-10-14',
  );
  expect(getNextRoutineDate({ ...schedule, postponedDates: ['2026-10-18'] }, '2026-10-18')).toBe(
    '2026-10-19',
  );
  expect(getNextRoutineDate({ ...schedule, postponedDates: ['2026-10-18'] }, '2026-10-20')).toBe(
    '2026-10-21',
  );
  expect(
    getNextRoutineDate({ ...schedule, intervalDays: Number.MAX_SAFE_INTEGER }, '2026-10-15'),
  ).toBeNull();
});

test('요일 반복의 다음 예정일은 오늘과 다음 주, 표시 가능한 날짜 끝을 구분한다', () => {
  const schedule = { type: 'weekdays' as const, days: [1, 5] };
  expect(getNextRoutineDate(schedule, '2026-10-16')).toBe('2026-10-16');
  expect(getNextRoutineDate(schedule, '2026-10-17')).toBe('2026-10-19');
  expect(getNextRoutineDate({ type: 'weekdays', days: [1] }, '2026-10-20')).toBe('2026-10-26');
  expect(getNextRoutineDate({ type: 'weekdays', days: [5] }, '9999-12-31')).toBe('9999-12-31');
  expect(getNextRoutineDate({ type: 'weekdays', days: [1] }, '9999-12-31')).toBeNull();
});

test('9월 30일부터 3일 간격이면 10월 16일의 다음 예정일은 18일이다', () => {
  expect(
    getNextRoutineDate(
      { type: 'interval', startDate: '2026-09-30', intervalDays: 3 },
      '2026-10-16',
    ),
  ).toBe('2026-10-18');
});
