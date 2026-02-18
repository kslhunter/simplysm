/**
 * Event definition created by defineEvent().
 * $info and $data are type-only markers (not used at runtime).
 */
export interface ServiceEventDef<TInfo = unknown, TData = unknown> {
  eventName: string;
  /** Type extraction only (not used at runtime) */
  readonly $info: TInfo;
  /** Type extraction only (not used at runtime) */
  readonly $data: TData;
}

/**
 * Define a service event with type-safe info and data.
 *
 * @example
 * const OrderUpdated = defineEvent<{ orderId: number }, { status: string }>("OrderUpdated");
 *
 * // Server emit
 * ctx.socket?.emitEvent(OrderUpdated, { orderId: 123 }, { status: "shipped" });
 *
 * // Client subscribe
 * await client.addEventListener(OrderUpdated, { orderId: 123 }, (data) => {
 *   console.log(data.status); // typed
 * });
 */
export function defineEvent<TInfo = unknown, TData = unknown>(
  eventName: string,
): ServiceEventDef<TInfo, TData> {
  return {
    eventName,
    $info: undefined as unknown as TInfo,
    $data: undefined as unknown as TData,
  };
}
