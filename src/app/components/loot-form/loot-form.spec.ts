import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LootForm } from './loot-form';

describe('LootForm', () => {
  let component: LootForm;
  let fixture: ComponentFixture<LootForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LootForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LootForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
