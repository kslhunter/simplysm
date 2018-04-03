interface StringConstructor {
    indent(indent: number): string;
}

String.indent = function (indent: number): string {
    let result = "";
    for (let i = 0; i < indent; i++) {
        result += " ";
    }
    return result;
};