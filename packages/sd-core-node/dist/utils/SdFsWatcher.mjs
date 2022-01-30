import * as chokidar from "chokidar";
import { ObjectUtil } from "@simplysm/sd-core-common";
export class SdFsWatcher {
    constructor(paths, options) {
        this._watcher = chokidar.watch(paths, ObjectUtil.merge(options, { ignoreInitial: true, persistent: true }));
    }
    static watch(paths) {
        return new SdFsWatcher(paths);
    }
    onChange(cb) {
        const changeInfoMap = new Map();
        this._watcher
            .on("all", (event, filePath) => {
            const prevEvent = changeInfoMap.getOrCreate(filePath, event);
            if (prevEvent === "add" && event === "change") {
                changeInfoMap.set(filePath, prevEvent);
            }
            else if ((prevEvent === "add" && event === "unlink") ||
                (prevEvent === "addDir" && event === "unlinkDir")) {
            }
            else {
                changeInfoMap.set(filePath, event);
            }
            setTimeout(() => {
                if (changeInfoMap.size === 0)
                    return;
                const changeInfos = Array.from(changeInfoMap.entries()).map((en) => ({
                    event: en[1],
                    path: en[0]
                }));
                changeInfoMap.clear();
                cb(changeInfos);
            }, 500);
        });
    }
    add(paths) {
        this._watcher.add(paths);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2RGc1dhdGNoZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvdXRpbHMvU2RGc1dhdGNoZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxLQUFLLFFBQVEsTUFBTSxVQUFVLENBQUM7QUFDckMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRXRELE1BQU0sT0FBTyxXQUFXO0lBR3RCLFlBQW9CLEtBQWUsRUFBRSxPQUErQjtRQUNsRSxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzlHLENBQUM7SUFFTSxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQWU7UUFDakMsT0FBTyxJQUFJLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBRU0sUUFBUSxDQUFDLEVBQW1FO1FBQ2pGLE1BQU0sYUFBYSxHQUFHLElBQUksR0FBRyxFQUE2QixDQUFDO1FBQzNELElBQUksQ0FBQyxRQUFRO2FBQ1YsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLEtBQXdCLEVBQUUsUUFBZ0IsRUFBRSxFQUFFO1lBQ3hELE1BQU0sU0FBUyxHQUFHLGFBQWEsQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzdELElBQUksU0FBUyxLQUFLLEtBQUssSUFBSSxLQUFLLEtBQUssUUFBUSxFQUFFO2dCQUM3QyxhQUFhLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQzthQUN4QztpQkFDSSxJQUNILENBQUMsU0FBUyxLQUFLLEtBQUssSUFBSSxLQUFLLEtBQUssUUFBUSxDQUFDO2dCQUMzQyxDQUFDLFNBQVMsS0FBSyxRQUFRLElBQUksS0FBSyxLQUFLLFdBQVcsQ0FBQyxFQUNqRDthQUNEO2lCQUNJO2dCQUNILGFBQWEsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO2FBQ3BDO1lBRUQsVUFBVSxDQUFDLEdBQUcsRUFBRTtnQkFDZCxJQUFJLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQztvQkFBRSxPQUFPO2dCQUNyQyxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDbkUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ1osSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7aUJBQ1osQ0FBQyxDQUFDLENBQUM7Z0JBQ0osYUFBYSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUV0QixFQUFFLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDbEIsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ1YsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRU0sR0FBRyxDQUFDLEtBQWU7UUFDeEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDM0IsQ0FBQztDQUNGIn0=