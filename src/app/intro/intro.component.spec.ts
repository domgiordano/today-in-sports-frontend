import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { INTRO_LENGTH, IntroComponent, dayBefore, sheetFor } from './intro.component';

describe('IntroComponent', () => {
  let fixture: ComponentFixture<IntroComponent>;
  let done: number;

  beforeEach(() => {
    fixture = TestBed.createComponent(IntroComponent);
    done = 0;
    fixture.componentInstance.done.subscribe(() => done++);
  });

  it('tears yesterday off to show today', () => {
    fixture.detectChanges();
    const today = sheetFor(new Date());
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.today .day')?.textContent).toBe(String(today.day));
    expect(el.querySelector('.yesterday .day')?.textContent).toBe(String(sheetFor(dayBefore(new Date())).day));
    expect(el.querySelector('.ticker')?.textContent).toContain(`${today.month} ${today.day}`);
  });

  it('hands off to the landing once the timeline ends', fakeAsync(() => {
    fixture.detectChanges();
    tick(INTRO_LENGTH - 1);
    expect(done).toBe(0);
    tick(1);
    expect(done).toBe(1);
  }));

  it('ends early, once, from the Skip pill or Escape', fakeAsync(() => {
    fixture.detectChanges();
    const skip: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(skip.getAttribute('aria-label')).toBe('Skip intro');

    skip.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    tick(300);
    expect(done).toBe(1);

    tick(INTRO_LENGTH);
    expect(done).toBe(1);
  }));
});

describe('dayBefore', () => {
  it('steps back a calendar day, across months and a 23-hour DST day', () => {
    expect(sheetFor(dayBefore(new Date(2026, 9, 1, 12)))).toEqual({ month: 'SEP', day: 30, weekday: 'WEDNESDAY' });
    // US spring-forward 2027 is March 14; 00:30 the next day minus 24h would be March 13.
    expect(dayBefore(new Date(2027, 2, 15, 0, 30)).getDate()).toBe(14);
  });
});
