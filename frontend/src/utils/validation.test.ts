import { describe, expect, it } from 'vitest';
import { validateRegistration } from './validation';
const valid = { first_name: 'Putter', last_name: 'Smith', email: 'putter@chula.ac.th', password: 'unusual phrase here' };
describe('registration validation', () => {
  it.each(['putter@chula.ac.th', 'abc@student.chula.ac.th', ' USER@ENG.CHULA.AC.TH '])('accepts approved email %s', email => {
    expect(validateRegistration({ ...valid, email })).toEqual({});
  });
  it.each(['user@gmail.com', 'user@evilchula.ac.th', 'user@chula.ac.th.evil.com', 'a@@chula.ac.th'])('rejects email %s', email => {
    expect(validateRegistration({ ...valid, email }).email).toBeDefined();
  });
  it('requires both names and rejects forbidden characters', () => {
    expect(validateRegistration({ ...valid, first_name: '', last_name: 'Smith1' })).toHaveProperty('first_name');
    expect(validateRegistration({ ...valid, last_name: 'Smith1' })).toHaveProperty('last_name');
  });
  it.each(['short', '1234567890'])('rejects invalid password %s', password => {
    expect(validateRegistration({ ...valid, password }).password).toBeDefined();
  });
  it('allows names with apostrophes and hyphens', () => {
    expect(validateRegistration({ ...valid, last_name: "O'Brien-Smith" })).toEqual({});
  });
  it('enforces name and department lengths', () => {
    const errors = validateRegistration({ ...valid, first_name: 'a'.repeat(151), department: 'a'.repeat(256) });
    expect(errors.first_name).toBeDefined();
    expect(errors.department).toBeDefined();
  });
});
