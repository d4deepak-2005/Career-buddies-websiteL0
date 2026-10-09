const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

export function numberWord(n: number, capitalize = false): string {
  const word = n >= 0 && n <= 10 ? ONES[n] : String(n);
  if (!capitalize) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function plansHeading(count: number): string {
  if (count <= 0) return 'Career Plans';
  if (count === 1) return 'The Career Plan';
  return `The ${numberWord(count, true)} Career Plans`;
}
