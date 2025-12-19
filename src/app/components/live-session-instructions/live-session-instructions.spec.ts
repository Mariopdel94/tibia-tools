import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiveSessionInstructions } from './live-session-instructions';

describe('LiveSessionInstructions', () => {
  let component: LiveSessionInstructions;
  let fixture: ComponentFixture<LiveSessionInstructions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiveSessionInstructions]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiveSessionInstructions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
