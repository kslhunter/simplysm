import { defineEvent } from "@simplysm/service-common";

/**
 * SharedData change event definition.
 *
 * @remarks
 * Event that notifies shared data changes between server and client.
 * - Event info: `{ name: string; filter: unknown }` -- data name and filter
 * - Event data: `(string | number)[] | undefined` -- array of changed item keys (undefined means full refresh)
 */
export const SharedDataChangeEvent = defineEvent<
  { name: string; filter: unknown },
  (string | number)[] | undefined
>("SharedDataChangeEvent");
