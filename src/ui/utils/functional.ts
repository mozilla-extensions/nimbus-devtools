export function debounce<F extends (...args: any[]) => void>(
  callback: F,
  delay: number,
): (...args: Parameters<F>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return function (...args: Parameters<F>): void {
    clearTimeout(timer);
    timer = setTimeout(() => {
      callback(...args);
    }, delay);
  };
}
