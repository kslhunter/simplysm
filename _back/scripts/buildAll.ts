import {build} from "./lib/build";

build("core").then(() => {
    return Promise.all([
        build("excel"),
        build("mail"),
        build("storage").then(() =>
            build("pack")
        ),
        build("database"),
        build("socket-common").then(() => Promise.all([
            build("socket-server"),
            build("socket-client").then(() =>
                build("angular")
            )
        ]))
    ]);
});