/**
 * 포맷 중립 조건부 서식 규칙 spec.
 *
 * 사용자 표면 `ExcelConditionalRule` 을 워크시트 모델이 소비하기 좋은 형태로 정규화한 것.
 * xml 은 `<cfRule>` 엘리먼트로, biff 는 CF 레코드군으로 직렬화한다.
 */
export interface ICfRuleSpec {
  type: "cellIs" | "containsText" | "notContainsText" | "beginsWith" | "endsWith" | "expression";
  operator?:
    | "lessThan"
    | "lessThanOrEqual"
    | "equal"
    | "notEqual"
    | "greaterThanOrEqual"
    | "greaterThan"
    | "between"
    | "notBetween"
    | "containsText"
    | "notContains"
    | "beginsWith"
    | "endsWith";
  text?: string;
  formula: string[];
}
