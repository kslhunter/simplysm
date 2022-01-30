import * as os from "os";
export class FunctionUtil {
    static parse(fn) {
        let matches = (/function\s?\(([^)]*)\)[^{]*{((?!return)(.|\r|\n))*return\s?((.|\r|\n)*);?\s?}$/)
            .exec(fn.toString());
        if (matches == null) {
            matches = (/^\(?([^)]*)\)?(\s?)=>(\s?)(.*)$/).exec(fn.toString());
            if (matches?.[4] === undefined) {
                throw new Error("Function 파싱 실패: " + fn.toString() + os.EOL);
            }
            if (matches[4].startsWith("{")) {
                const newMatch = (/(?!return)(.|\r|\n)*return\s((.|\r|\n)*);/).exec(matches[4]);
                if (newMatch?.[2] !== undefined) {
                    matches[4] = newMatch[2];
                }
                else {
                    throw new Error("Function 파싱 실패: " + fn.toString() + os.EOL);
                }
            }
        }
        const params = matches[1].split(",").map((item) => item.trim());
        let returnContent = matches[4].trim();
        if (returnContent.endsWith(";")) {
            returnContent = returnContent.slice(0, -1);
        }
        return {
            params,
            returnContent
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRnVuY3Rpb25VdGlsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3V0aWxzL0Z1bmN0aW9uVXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQUV6QixNQUFNLE9BQU8sWUFBWTtJQUNoQixNQUFNLENBQUMsS0FBSyxDQUFDLEVBQTJCO1FBQzdDLElBQUksT0FBTyxHQUNQLENBQUMsZ0ZBQWdGLENBQUM7YUFDakYsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBRXpCLElBQUksT0FBTyxJQUFJLElBQUksRUFBRTtZQUNuQixPQUFPLEdBQUcsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUNsRSxJQUFJLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLFNBQVMsRUFBRTtnQkFDOUIsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQkFBa0IsR0FBRyxFQUFFLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQzlEO1lBRUQsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUM5QixNQUFNLFFBQVEsR0FBRyxDQUFDLDJDQUEyQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNoRixJQUFJLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLFNBQVMsRUFBRTtvQkFDL0IsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDMUI7cUJBQ0k7b0JBQ0gsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQkFBa0IsR0FBRyxFQUFFLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2lCQUM5RDthQUNGO1NBQ0Y7UUFFRCxNQUFNLE1BQU0sR0FBYSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7UUFDMUUsSUFBSSxhQUFhLEdBQVcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQzlDLElBQUksYUFBYSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUMvQixhQUFhLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUM1QztRQUVELE9BQU87WUFDTCxNQUFNO1lBQ04sYUFBYTtTQUNkLENBQUM7SUFDSixDQUFDO0NBQ0YifQ==