import { SdError } from "./SdError";
export class NeverEntryError extends SdError {
    constructor(message) {
        super("절대 진입될 수 없는것으로 판단된 코드에 진입되었습니다" + (message !== undefined ? ": " + message : ""));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTmV2ZXJFbnRyeUVycm9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2Vycm9ycy9OZXZlckVudHJ5RXJyb3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUVwQyxNQUFNLE9BQU8sZUFBZ0IsU0FBUSxPQUFPO0lBQzFDLFlBQW1CLE9BQWdCO1FBQ2pDLEtBQUssQ0FBQyxnQ0FBZ0MsR0FBRyxDQUFDLE9BQU8sS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDMUYsQ0FBQztDQUNGIn0=