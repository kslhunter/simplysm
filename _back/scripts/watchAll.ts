import {watch} from "./lib/watch";

watch("core").then(() => {
    return Promise.all([
        watch("excel"),
        watch("mail"),
        watch("storage").then(() =>
            watch("pack")
        ),
        watch("database"),
        watch("socket-common").then(() => Promise.all([
            watch("socket-server"),
            watch("socket-client").then(() =>
                watch("angular")
            )
        ]))
    ]);
}).then(() => {
    console.log("\n\n-------------- 모든 감지 시작 ------------\n\n");
});