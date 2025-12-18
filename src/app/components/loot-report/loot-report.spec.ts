import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LootReport } from './loot-report';

describe('LootReport', () => {
  let component: LootReport;
  let fixture: ComponentFixture<LootReport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LootReport]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LootReport);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
