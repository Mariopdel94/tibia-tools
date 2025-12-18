import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SessionMembers } from './session-members';

describe('SessionMembers', () => {
  let component: SessionMembers;
  let fixture: ComponentFixture<SessionMembers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SessionMembers]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SessionMembers);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
