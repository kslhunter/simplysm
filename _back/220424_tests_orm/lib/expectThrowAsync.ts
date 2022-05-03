import { expect } from "chai";


export async function expectThrowAsync(fn: () => Promise<any>, then: (err?: Error) => void): Promise<void> {
  try {
    await fn();
  }
  catch (err) {
    then(err);
    return;
  }
  expect.fail();
}
