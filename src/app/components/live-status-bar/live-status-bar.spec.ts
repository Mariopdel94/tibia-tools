import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiveStatusBar } from './live-status-bar';

describe('LiveStatusBar', () => {
  let component: LiveStatusBar;
  let fixture: ComponentFixture<LiveStatusBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiveStatusBar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiveStatusBar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
