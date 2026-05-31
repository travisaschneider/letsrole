export class ArrayUtil {
  public static equals<T>(a: Array<T>, b: Array<T>): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length != b.length) return false;

    for (let i = 0; i < a.length; ++i) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  public static shuffle<T>(array: any[]): T {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }

    return array as unknown as T;
  }

  public static unique<T>(arr: T[]): T[] {
    return [...new Set<T>(arr)];
  }
}
