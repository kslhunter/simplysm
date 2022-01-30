import * as path from "path";
export class PathUtil {
    static posix(...args) {
        const resolvedPath = path.join(...args);
        return resolvedPath.replace(/\\/g, "/");
    }
    static changeFileDirectory(filePath, fromDirectory, toDirectory) {
        if (filePath === fromDirectory) {
            return toDirectory;
        }
        if (!PathUtil.isChildPath(filePath, fromDirectory)) {
            throw new Error(`'${filePath}'가 ${fromDirectory}안에 없습니다.`);
        }
        return path.resolve(toDirectory, path.relative(fromDirectory, filePath));
    }
    static removeExt(filePath) {
        return path.basename(filePath, path.extname(filePath));
    }
    static isChildPath(childPath, parentPath) {
        const relativePath = path.relative(parentPath, childPath);
        return Boolean(relativePath) && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGF0aFV0aWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvdXRpbHMvUGF0aFV0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUM7QUFFN0IsTUFBTSxPQUFPLFFBQVE7SUFDWixNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBYztRQUNuQyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDeEMsT0FBTyxZQUFZLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRU0sTUFBTSxDQUFDLG1CQUFtQixDQUFDLFFBQWdCLEVBQUUsYUFBcUIsRUFBRSxXQUFtQjtRQUM1RixJQUFJLFFBQVEsS0FBSyxhQUFhLEVBQUU7WUFDOUIsT0FBTyxXQUFXLENBQUM7U0FDcEI7UUFFRCxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsYUFBYSxDQUFDLEVBQUU7WUFDbEQsTUFBTSxJQUFJLEtBQUssQ0FBQyxJQUFJLFFBQVEsTUFBTSxhQUFhLFVBQVUsQ0FBQyxDQUFDO1NBQzVEO1FBRUQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQzNFLENBQUM7SUFFTSxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQWdCO1FBQ3RDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQ3pELENBQUM7SUFFTSxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQWlCLEVBQUUsVUFBa0I7UUFDN0QsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDMUQsT0FBTyxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUNuRyxDQUFDO0NBQ0YifQ==