export function makeTxRecorder(selectResults: any[][] = []) {
  const calls: string[] = [];
  let selectIndex = 0;

  function makeChain(methodName: string): any {
    return new Proxy(function () {}, {
      get(_target, prop: string) {
        if (prop === "then") {
          const isSelect = methodName === "select" || methodName === "selectDistinct";
          const result = isSelect ? (selectResults[selectIndex++] ?? []) : undefined;
          return (resolve: (value: any) => void) => resolve(result);
        }
        return () => makeChain(methodName);
      },
    });
  }

  const tx: any = new Proxy(function () {}, {
    get(_target, prop: string) {
      return () => {
        calls.push(prop);
        return makeChain(prop);
      };
    },
  });

  return { tx, calls };
}
