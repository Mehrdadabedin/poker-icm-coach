import { request } from "./api";

export interface IcmResult {
  equities: number[];
  method: string;
}

export function icmEquities(
  stacks: number[],
  payouts: number[],
): Promise<IcmResult> {
  const stacksStr = stacks.join(",");
  const payoutsStr = payouts.join(",");
  return request<IcmResult>(
    `/api/icm?stacks=${stacksStr}&payouts=${payoutsStr}`,
  );
}
