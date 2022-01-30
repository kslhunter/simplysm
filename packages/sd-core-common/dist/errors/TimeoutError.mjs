import { SdError } from "./SdError";
export class TimeoutError extends SdError {
    constructor(millisecond, message) {
        super("대기시간이 초과되었습니다"
            + (millisecond !== undefined ? `(${millisecond}ms)` : "")
            + (message !== undefined ? `: ${message}` : ""));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGltZW91dEVycm9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2Vycm9ycy9UaW1lb3V0RXJyb3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUVwQyxNQUFNLE9BQU8sWUFBYSxTQUFRLE9BQU87SUFDdkMsWUFBbUIsV0FBb0IsRUFBRSxPQUFnQjtRQUN2RCxLQUFLLENBQ0gsZUFBZTtjQUNiLENBQUMsV0FBVyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxXQUFXLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2NBQ3ZELENBQUMsT0FBTyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQ2hELENBQUM7SUFDSixDQUFDO0NBQ0YifQ==