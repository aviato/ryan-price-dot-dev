export default function isEmptyValue(val: unknown): boolean {
  return val === undefined || val === null;
}
