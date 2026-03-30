import ts from "typescript";
import type { NgtscProgram } from "./angular-build.js";

type NgCompiler = NgtscProgram["compiler"];

/**
 * HMR에서 지원하는 Angular @Component 메타데이터 필드 이름.
 * 이 필드만 변경된 경우 HMR 후보로 판정된다.
 */
const SUPPORTED_FIELD_NAMES = new Set([
  "template",
  "templateUrl",
  "styles",
  "styleUrl",
  "stylesUrl",
]);

const enum MetaUpdateAnalysis {
  Supported = 0,
  Unsupported = 1,
  None = 2,
}

/**
 * 수정된 파일들을 분석하여 HMR 후보 컴포넌트를 수집한다.
 * 하나의 파일이라도 비지원 변경이면 전체 HMR을 취소한다 (all-or-nothing).
 */
export function collectHmrCandidates(
  modifiedFiles: ReadonlySet<string>,
  compiler: NgCompiler,
  staleSourceFiles: ReadonlyMap<string, ts.SourceFile>,
): Set<ts.ClassDeclaration> {
  const candidates = new Set<ts.ClassDeclaration>();

  for (const file of modifiedFiles) {
    // 템플릿 파일이면 해당 컴포넌트를 후보에 추가
    const templateFileNodes = compiler.getComponentsWithTemplateFile(file);
    if (templateFileNodes.size > 0) {
      for (const node of templateFileNodes) {
        candidates.add(node as ts.ClassDeclaration);
      }
      continue;
    }

    // 스타일 파일이면 해당 컴포넌트를 후보에 추가
    const styleFileNodes = compiler.getComponentsWithStyleFile(file);
    if (styleFileNodes.size > 0) {
      for (const node of styleFileNodes) {
        candidates.add(node as ts.ClassDeclaration);
      }
      continue;
    }

    // stale source가 없으면 전체 무효화
    const staleSource = staleSourceFiles.get(file);
    if (staleSource === undefined) {
      candidates.clear();
      break;
    }

    // current source가 없으면 전체 무효화
    const updatedSource = compiler.getCurrentProgram().getSourceFile(file);
    if (updatedSource === undefined) {
      candidates.clear();
      break;
    }

    // AST 비교로 HMR 후보 분석
    const fileCandidates = analyzeFileUpdates(staleSource, updatedSource, compiler);
    if (fileCandidates != null) {
      for (const node of fileCandidates) {
        candidates.add(node);
      }
    } else {
      // 비지원 변경 → 전체 무효화
      candidates.clear();
      break;
    }
  }

  return candidates;
}

/**
 * stale/current 소스 파일의 AST를 비교하여 HMR 후보를 판별한다.
 * @returns HMR 후보 ClassDeclaration 배열. null이면 비지원 변경.
 */
export function analyzeFileUpdates(
  stale: ts.SourceFile,
  updated: ts.SourceFile,
  compiler?: NgCompiler,
): ts.ClassDeclaration[] | null {
  if (stale.statements.length !== updated.statements.length) {
    return null;
  }

  const candidates: ts.ClassDeclaration[] = [];

  for (let i = 0; i < updated.statements.length; ++i) {
    const updatedNode = updated.statements[i];
    const staleNode = stale.statements[i];

    if (ts.isClassDeclaration(updatedNode)) {
      if (!ts.isClassDeclaration(staleNode)) {
        return null;
      }

      // name 비교
      if (updatedNode.name?.text !== staleNode.name?.text) {
        return null;
      }

      // heritage 비교
      if (!equalRangeText(updatedNode.heritageClauses, updated, staleNode.heritageClauses, stale)) {
        return null;
      }

      // modifiers 비교
      const updatedModifiers = ts.getModifiers(updatedNode);
      const staleModifiers = ts.getModifiers(staleNode);
      if (
        updatedModifiers?.length !== staleModifiers?.length ||
        !updatedModifiers?.every((updatedModifier) =>
          staleModifiers?.some((staleModifier) => updatedModifier.kind === staleModifier.kind),
        )
      ) {
        return null;
      }

      // @Component 메타 확인 (compiler 없으면 non-component로 취급)
      if (compiler != null) {
        const meta = (compiler as any).getMeta(updatedNode);
        if (meta?.decorator != null && meta.isComponent === true) {
          const updatedDecorators = ts.getDecorators(updatedNode);
          const staleDecorators = ts.getDecorators(staleNode);

          if (
            staleDecorators == null ||
            staleDecorators.length !== updatedDecorators?.length
          ) {
            return null;
          }

          // 다중 데코레이터는 미지원
          if (staleDecorators.length > 1) {
            return null;
          }

          // 데코레이터 인덱스 확인
          const metaDecoratorIndex = updatedDecorators.indexOf(meta.decorator);
          if (metaDecoratorIndex < 0) {
            return null;
          }

          const updatedDecoratorExpression = meta.decorator.expression;
          if (
            !ts.isCallExpression(updatedDecoratorExpression) ||
            updatedDecoratorExpression.arguments.length !== 1
          ) {
            return null;
          }

          const staleDecoratorExpression = staleDecorators[metaDecoratorIndex].expression;
          if (
            !ts.isCallExpression(staleDecoratorExpression) ||
            staleDecoratorExpression.arguments.length !== 1
          ) {
            return null;
          }

          // 데코레이터 이름/expression 비교
          if (
            !equalRangeText(
              updatedDecoratorExpression.expression,
              updated,
              staleDecoratorExpression.expression,
              stale,
            )
          ) {
            return null;
          }

          // 메타데이터 비교
          const analysis = analyzeMetaUpdates(
            staleDecoratorExpression,
            stale,
            updatedDecoratorExpression,
            updated,
          );
          if (analysis === MetaUpdateAnalysis.Unsupported) {
            return null;
          }

          // 클래스 멤버 비교
          if (!equalRangeText(updatedNode.members, updated, staleNode.members, stale)) {
            return null;
          }

          // 지원 변경이면 후보에 추가
          if (analysis === MetaUpdateAnalysis.Supported) {
            candidates.push(updatedNode);
          }
          continue;
        }
      }

      // non-component 클래스: 텍스트 변경 확인
      if (!equalRangeText(updatedNode, updated, staleNode, stale)) {
        return null;
      }
      continue;
    }

    // 기타 statement: 텍스트 비교
    if (!equalRangeText(updatedNode, updated, staleNode, stale)) {
      return null;
    }
  }

  return candidates;
}

/**
 * @Component 데코레이터의 메타데이터 필드를 비���한다.
 * 지원 필드만 변경되었으면 Supported, 비지원 필드가 변경되면 Unsupported.
 */
function analyzeMetaUpdates(
  staleCall: ts.CallExpression,
  staleSource: ts.SourceFile,
  updatedCall: ts.CallExpression,
  updatedSource: ts.SourceFile,
): MetaUpdateAnalysis {
  const staleObject = staleCall.arguments[0];
  const updatedObject = updatedCall.arguments[0];

  if (
    !ts.isObjectLiteralExpression(staleObject) ||
    !ts.isObjectLiteralExpression(updatedObject)
  ) {
    return MetaUpdateAnalysis.Unsupported;
  }

  let hasSupportedUpdate = false;
  const supportedFields = new Map<string, ts.Expression>();
  const unsupportedFields: ts.Expression[] = [];

  for (const property of staleObject.properties) {
    if (!ts.isPropertyAssignment(property) || ts.isComputedPropertyName(property.name)) {
      return MetaUpdateAnalysis.Unsupported;
    }
    const name = (property.name as ts.Identifier).text;
    if (SUPPORTED_FIELD_NAMES.has(name)) {
      supportedFields.set(name, property.initializer);
      continue;
    }
    unsupportedFields.push(property.initializer);
  }

  let unsupportedIdx = 0;
  for (const property of updatedObject.properties) {
    if (!ts.isPropertyAssignment(property) || ts.isComputedPropertyName(property.name)) {
      return MetaUpdateAnalysis.Unsupported;
    }
    const name = (property.name as ts.Identifier).text;
    if (SUPPORTED_FIELD_NAMES.has(name)) {
      const staleInitializer = supportedFields.get(name);
      if (
        staleInitializer == null ||
        !equalRangeText(property.initializer, updatedSource, staleInitializer, staleSource)
      ) {
        hasSupportedUpdate = true;
      }
      supportedFields.delete(name);
      continue;
    }
    if (
      !equalRangeText(
        property.initializer,
        updatedSource,
        unsupportedFields[unsupportedIdx++],
        staleSource,
      )
    ) {
      return MetaUpdateAnalysis.Unsupported;
    }
  }

  if (unsupportedIdx !== unsupportedFields.length) {
    return MetaUpdateAnalysis.Unsupported;
  }

  // 남은 supported field가 있으면 삭제된 것 → supported update
  hasSupportedUpdate ||= supportedFields.size > 0;

  return hasSupportedUpdate ? MetaUpdateAnalysis.Supported : MetaUpdateAnalysis.None;
}

/**
 * 두 소스 파일에서 지정된 범위의 텍스트를 비교한다.
 * 중간 문자열 복사를 피하여 효율적으로 비교한다.
 */
function equalRangeText(
  firstRange: ts.TextRange | ts.NodeArray<ts.Node> | undefined,
  firstSource: ts.SourceFile,
  secondRange: ts.TextRange | ts.NodeArray<ts.Node> | undefined,
  secondSource: ts.SourceFile,
): boolean {
  if (firstRange == null || secondRange == null) {
    return firstRange === secondRange;
  }

  const firstLength = firstRange.end - firstRange.pos;
  const secondLength = secondRange.end - secondRange.pos;
  if (firstLength !== secondLength) {
    return false;
  }

  for (let i = 0; i < firstLength; ++i) {
    if (
      firstSource.text.charCodeAt(i + firstRange.pos) !==
      secondSource.text.charCodeAt(i + secondRange.pos)
    ) {
      return false;
    }
  }
  return true;
}
