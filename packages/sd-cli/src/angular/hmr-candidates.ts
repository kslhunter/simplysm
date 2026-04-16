import ts from "typescript";
import type { NgtscProgram } from "./angular-build.js";

// NgCompiler 타입은 NgtscProgram.compiler에서 추론
type NgCompiler = NgtscProgram["compiler"];

/** HMR 분석 대상 최대 변경 파일 수 */
export const HMR_MODIFIED_FILE_LIMIT = 32;

/**
 * HMR 지원 메타데이터 필드.
 * template, templateUrl, styles, styleUrl, stylesUrl만 HMR 업데이트를 지원한다.
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
 * 변경된 파일에서 HMR 후보 컴포넌트 클래스를 수집한다.
 *
 * - 템플릿/스타일 파일 변경 → 해당 파일을 사용하는 컴포넌트가 후보
 * - 소스 파일 변경 → 인라인 템플릿/스타일만 변경된 컴포넌트가 후보
 * - 지원 불가 변경(클래스 멤버, 비-컴포넌트 문 변경 등) → 후보 전체 무효화
 */
export function collectHmrCandidates(
  modifiedFiles: Set<string>,
  angularProgram: NgtscProgram,
  staleSourceFiles?: Map<string, ts.SourceFile>,
): Set<ts.ClassDeclaration> {
  const compiler = angularProgram.compiler;
  const candidates = new Set<ts.ClassDeclaration>();

  for (const file of modifiedFiles) {
    // 템플릿 파일 변경 → 소유 컴포넌트 추가
    const templateFileNodes = compiler.getComponentsWithTemplateFile(file);
    if (templateFileNodes.size > 0) {
      for (const node of templateFileNodes) {
        if (ts.isClassDeclaration(node)) {
          candidates.add(node);
        }
      }
      continue;
    }

    // 스타일 파일 변경 → 소유 컴포넌트 추가
    const styleFileNodes = compiler.getComponentsWithStyleFile(file);
    if (styleFileNodes.size > 0) {
      for (const node of styleFileNodes) {
        if (ts.isClassDeclaration(node)) {
          candidates.add(node);
        }
      }
      continue;
    }

    // 소스 파일 변경 → 상세 분석
    const staleSource = staleSourceFiles?.get(file);
    if (staleSource == null) {
      // 알 수 없는 파일 → full rebuild
      candidates.clear();
      break;
    }

    const updatedSource = compiler.getCurrentProgram().getSourceFile(file);
    if (updatedSource == null) {
      // 더 이상 존재하지 않는 파일 → full rebuild
      candidates.clear();
      break;
    }

    const fileCandidates = analyzeFileUpdates(staleSource, updatedSource, compiler);
    if (fileCandidates != null) {
      for (const node of fileCandidates) {
        candidates.add(node);
      }
    } else {
      // 지원 불가 변경 → full rebuild
      candidates.clear();
      break;
    }
  }

  return candidates;
}

/**
 * 소스 파일의 변경사항을 분석하여 HMR 후보 컴포넌트를 반환한다.
 * 지원 불가 변경이 있으면 null을 반환한다.
 */
function analyzeFileUpdates(
  stale: ts.SourceFile,
  updated: ts.SourceFile,
  compiler: NgCompiler,
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

      // 클래스 이름/상속/수정자 변경 확인
      if (updatedNode.name?.text !== staleNode.name?.text) {
        return null;
      }
      if (!equalRangeText(updatedNode.heritageClauses, updated, staleNode.heritageClauses, stale)) {
        return null;
      }
      const updatedModifiers = ts.getModifiers(updatedNode);
      const staleModifiers = ts.getModifiers(staleNode);
      if (
        updatedModifiers?.length !== staleModifiers?.length ||
        !updatedModifiers?.every((m) => staleModifiers?.some((sm) => m.kind === sm.kind))
      ) {
        return null;
      }

      // 컴포넌트 클래스 확인
      const meta = compiler.getMeta(updatedNode);
      if (meta?.decorator != null && (meta as unknown as Record<string, unknown>)["isComponent"] === true) {
        const updatedDecorators = ts.getDecorators(updatedNode);
        const staleDecorators = ts.getDecorators(staleNode);

        if (staleDecorators == null || staleDecorators.length !== updatedDecorators?.length) {
          return null;
        }
        if (staleDecorators.length > 1) {
          return null;
        }

        const metaDecoratorIndex = updatedDecorators.indexOf(meta.decorator);

        const updatedDecExpr = meta.decorator.expression;
        if (
          !ts.isCallExpression(updatedDecExpr) ||
          updatedDecExpr.arguments.length !== 1
        ) {
          return null;
        }

        const staleDecExpr = staleDecorators[metaDecoratorIndex].expression;
        if (
          !ts.isCallExpression(staleDecExpr) ||
          staleDecExpr.arguments.length !== 1
        ) {
          return null;
        }

        // 데코레이터 이름/표현식 비교
        if (!equalRangeText(updatedDecExpr.expression, updated, staleDecExpr.expression, stale)) {
          return null;
        }

        // 메타데이터 변경 분석
        const analysis = analyzeMetaUpdates(staleDecExpr, stale, updatedDecExpr, updated);
        if (analysis === MetaUpdateAnalysis.Unsupported) {
          return null;
        }

        // 클래스 멤버 변경 확인
        if (!equalRangeText(updatedNode.members, updated, staleNode.members, stale)) {
          return null;
        }

        if (analysis === MetaUpdateAnalysis.Supported) {
          candidates.push(updatedNode);
        }
        continue;
      }
    }

    // 비-컴포넌트 문 변경 확인
    if (!equalRangeText(updatedNode, updated, staleNode, stale)) {
      return null;
    }
  }

  return candidates;
}

/**
 * 컴포넌트 데코레이터의 메타데이터 필드 변경을 분석한다.
 * 지원 필드(template, styles 등)만 변경되었으면 Supported,
 * 비지원 필드가 변경되었으면 Unsupported,
 * 변경 없으면 None.
 */
function analyzeMetaUpdates(
  staleCall: ts.CallExpression,
  staleSource: ts.SourceFile,
  updatedCall: ts.CallExpression,
  updatedSource: ts.SourceFile,
): MetaUpdateAnalysis {
  const staleObject = staleCall.arguments[0];
  const updatedObject = updatedCall.arguments[0];
  let hasSupportedUpdate = false;

  if (!ts.isObjectLiteralExpression(staleObject) || !ts.isObjectLiteralExpression(updatedObject)) {
    return MetaUpdateAnalysis.Unsupported;
  }

  const supportedFields = new Map<string, ts.Expression>();
  const unsupportedFields: ts.Expression[] = [];

  for (const property of staleObject.properties) {
    if (!ts.isPropertyAssignment(property) || ts.isComputedPropertyName(property.name)) {
      return MetaUpdateAnalysis.Unsupported;
    }
    const name = (property.name as ts.Identifier).text;
    if (SUPPORTED_FIELD_NAMES.has(name)) {
      supportedFields.set(name, property.initializer);
    } else {
      unsupportedFields.push(property.initializer);
    }
  }

  let j = 0;
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
    } else {
      if (!equalRangeText(property.initializer, updatedSource, unsupportedFields[j++], staleSource)) {
        return MetaUpdateAnalysis.Unsupported;
      }
    }
  }

  if (j !== unsupportedFields.length) {
    return MetaUpdateAnalysis.Unsupported;
  }

  // 남은 supported field → 제거됨 → supported update
  hasSupportedUpdate ||= supportedFields.size > 0;

  return hasSupportedUpdate ? MetaUpdateAnalysis.Supported : MetaUpdateAnalysis.None;
}

/**
 * 두 소스 파일 범위의 텍스트를 문자 단위로 비교한다.
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
