"use strict";

const ts = require("typescript");
const path = require("path");

const multipleComponentsPerFileError = "@simplysm/eslint-plugin currently only supports 1 Component per file";

const rangeMap = new Map();

function quickGetRangeForTemplate(text, template) {
  const start = text.indexOf(template);
  return [start, start + template.length];
}

module.exports = {
  preprocess(text, filename) {
    try {
      const sourceFile = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true);

      const classDeclarations = sourceFile.statements.filter((s) => ts.isClassDeclaration(s));
      if (!classDeclarations.length) {
        return [text];
      }

      /**
       * Find all the Component decorators
       */
      const componentDecoratorNodes = [];
      for (const classDeclaration of classDeclarations) {
        if (classDeclaration.decorators) {
          for (const decorator of classDeclaration.decorators) {
            if (
              ts.isCallExpression(decorator.expression) &&
              ts.isIdentifier(decorator.expression.expression) &&
              decorator.expression.expression.text === "Component"
            ) {
              componentDecoratorNodes.push(decorator);
            }
          }
        }
      }

      /**
       * Ignore malformed Component files
       */
      if (!componentDecoratorNodes.length) {
        return [text];
      }

      /**
       * Only support one component per file for now...
       * I don't know if people actually use multiple components per file in practice
       * and I think it makes sense to wait until people complain about this before
       * attempting to figure out support for it (rather than having something half-baked)
       */
      if (componentDecoratorNodes.length > 1) {
        throw new Error(multipleComponentsPerFileError);
      }

      const componentDecoratorNode = componentDecoratorNodes[0];
      /**
       * Ignore malformed component metadata
       */
      if (
        !ts.isDecorator(componentDecoratorNode) ||
        !ts.isCallExpression(componentDecoratorNode.expression) ||
        componentDecoratorNode.expression.arguments.length !== 1
      ) {
        return [text];
      }

      const metadata = componentDecoratorNode.expression.arguments[0];
      if (!ts.isObjectLiteralExpression(metadata)) {
        return [text];
      }

      /**
       * Ignore Components which have external template files, they will be linted directly,
       * and any that have inline templates which are malformed
       */
      const templateProperty = metadata.properties.find((id) => id && id.name && id.name.getText() === "template");
      if (metadata.properties.find((id) => id && id.name && id.name.getText() === "templateUrl") || !templateProperty) {
        return [text];
      }

      if (!ts.isPropertyAssignment(templateProperty) || !ts.isStringLiteralLike(templateProperty.initializer)) {
        return [text];
      }

      const templateText = templateProperty.initializer.text;
      const realTemplateText = templateText.replace(/\n/g, "\r\n").replace(/`/g, "\\`");

      const range = quickGetRangeForTemplate(text, realTemplateText);

      rangeMap.set(filename, {
        range,
        lineAndCharacter: {
          start: sourceFile.getLineAndCharacterOfPosition(range[0]),
          end: sourceFile.getLineAndCharacterOfPosition(range[1])
        }
      });

      /**
       * We return an array containing both the original source, and a new fragment
       * representing the inline HTML template. It must have an appropriate .html
       * extension so that it can be linted using the right rules and plugins.
       *
       * The postprocessor will handle tying things back to the right position
       * in the original file, so this temporary filename will never be visible
       * to the end user.
       */
      return [
        text,
        {
          text: realTemplateText,
          filename: path.basename(filename).replace(/\.ts$/, ".html")
        }
      ];
    } catch (err) {
      // Rethrow known error
      if (err.message === multipleComponentsPerFileError) {
        throw err;
      }

      err.message = "preprocess: ERROR could not parse @Component() metadata " + filename + "\n=> " + err.message;
      // eslint-disable-next-line no-console
      console.error(err);
      return [text];
    }
  },
  postprocess(multiDimensionalMessages, filename) {
    const messagesFromComponentSource = multiDimensionalMessages[0];
    const messagesFromInlineTemplateHTML = multiDimensionalMessages[1];
    /**
     * If the Component did not have an inline template the second item
     * in the multiDimensionalMessages will not exist
     */
    if (!messagesFromInlineTemplateHTML || !messagesFromInlineTemplateHTML.length) {
      return messagesFromComponentSource;
    }
    const rangeData = rangeMap.get(filename);
    if (rangeData === undefined) {
      return messagesFromComponentSource;
    }

    /**
     * Adjust message location data to apply it back to the
     * original file
     */
    return [
      ...messagesFromComponentSource,
      ...messagesFromInlineTemplateHTML.map((message) => {
        message.line += rangeData.lineAndCharacter.start.line;
        // message.column += rangeData.lineAndCharacter.start.character;

        message.endLine += rangeData.lineAndCharacter.start.line;
        // message.endColumn += rangeData.lineAndCharacter.start.character;

        const startOffset = rangeData.range[0];
        if (message.fix) {
          message.fix.range = [startOffset + message.fix.range[0], startOffset + message.fix.range[1]];
        }
        return message;
      })
    ];
  },
  supportsAutofix: true
};
