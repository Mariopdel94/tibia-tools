import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiveSession } from './live-session';

describe('LiveSession', () => {
  let component: LiveSession;
  let fixture: ComponentFixture<LiveSession>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiveSession]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiveSession);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
