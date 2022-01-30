import { SdError } from "./SdError";
export class ArgumentError extends SdError {
    constructor(argObj) {
        super("인수가 잘못되었습니다: " + JSON.stringify(argObj));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXJndW1lbnRFcnJvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9lcnJvcnMvQXJndW1lbnRFcnJvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBRXBDLE1BQU0sT0FBTyxhQUFjLFNBQVEsT0FBTztJQUN4QyxZQUFtQixNQUEyQjtRQUM1QyxLQUFLLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUNsRCxDQUFDO0NBQ0YifQ==