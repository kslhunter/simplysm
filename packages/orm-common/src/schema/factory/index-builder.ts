// ============================================
// IndexBuilder
// ============================================

/**
 * Index 정의 builder
 *
 * Fluent API로 index column, 유니크 여부, 정렬 순서를 정의
 * TableBuilder.indexes()에서 사용
 *
 * @template TKeys - Index column key 배열 타입
 *
 * @example
 * ```typescript
 * Table("User")
 *   .columns((c) => ({
 *     id: c.bigint(),
 *     email: c.varchar(200),
 *     name: c.varchar(100),
 *     createdAt: c.datetime(),
 *   }))
 *   .indexes((i) => [
 *     // 유니크 index
 *     i.index("email").unique(),
 *
 *     // 복합 index + 정렬 순서
 *     i.index("name", "createdAt").orderBy("ASC", "DESC"),
 *
 *     // 커스텀 이름
 *     i.index("createdAt").name("IX_User_CreatedAt"),
 *   ]);
 * ```
 *
 * @see {@link createIndexFactory} Index factory
 * @see {@link TableBuilder} Table builder
 */
export class IndexBuilder<TKeys extends string[]> {
  /**
   * @param meta - Index 메타데이터
   * @param meta.columns - Index column 배열
   * @param meta.name - Index 이름 (선택)
   * @param meta.unique - 유니크 index 여부
   * @param meta.orderBy - column별 정렬 순서
   * @param meta.description - Index 설명
   */
  constructor(
    readonly meta: {
      columns: TKeys;
      name?: string;
      unique?: boolean;
      orderBy?: { [K in keyof TKeys]: "ASC" | "DESC" };
      description?: string;
    },
  ) {}

  /**
   * Index 이름 설정
   *
   * @param name - Index 이름
   * @returns 새 IndexBuilder 인스턴스
   *
   * @example
   * ```typescript
   * i.index("email").name("IX_User_Email")
   * ```
   */
  name(name: string): IndexBuilder<TKeys> {
    return new IndexBuilder({ ...this.meta, name });
  }

  /**
   * 유니크 index 설정
   *
   * @returns 새 IndexBuilder 인스턴스
   *
   * @example
   * ```typescript
   * i.index("email").unique()
   * ```
   */
  unique(): IndexBuilder<TKeys> {
    return new IndexBuilder({ ...this.meta, unique: true });
  }

  /**
   * 정렬 순서 설정
   *
   * 각 column에 ASC 또는 DESC를 지정
   *
   * @param orderBy - column별 정렬 순서 (column 수와 일치해야 함)
   * @returns 새 IndexBuilder 인스턴스
   *
   * @example
   * ```typescript
   * // 단일 column
   * i.index("createdAt").orderBy("DESC")
   *
   * // 복합 column
   * i.index("status", "createdAt").orderBy("ASC", "DESC")
   * ```
   */
  orderBy(...orderBy: { [K in keyof TKeys]: "ASC" | "DESC" }): IndexBuilder<TKeys> {
    return new IndexBuilder({ ...this.meta, orderBy });
  }

  /**
   * Index 설명 설정
   *
   * @param description - Index 설명 (DDL Comment로 사용됨)
   * @returns 새 IndexBuilder 인스턴스
   */
  description(description: string): IndexBuilder<TKeys> {
    return new IndexBuilder({ ...this.meta, description });
  }
}

// ============================================
// IndexFactory
// ============================================

/**
 * Index builder factory 생성
 *
 * TableBuilder.indexes()에서 사용하는 index factory
 *
 * @template TColumnKey - Table column key 타입
 * @returns Index 생성 메서드를 포함하는 객체
 *
 * @example
 * ```typescript
 * Table("User")
 *   .columns((c) => ({
 *     id: c.bigint(),
 *     email: c.varchar(200),
 *     name: c.varchar(100),
 *   }))
 *   .indexes((i) => [
 *     i.index("email").unique(),
 *     i.index("name"),
 *   ]);
 * ```
 *
 * @see {@link IndexBuilder} Index builder 클래스
 */
export function createIndexFactory<TColumnKey extends string>() {
  return {
    /**
     * Index 생성
     *
     * @template TKeys - Index column key 배열 타입
     * @param columns - Index column 이름들
     * @returns IndexBuilder 인스턴스
     *
     * @example
     * ```typescript
     * i.index("email")          // 단일 column
     * i.index("name", "email")  // 복합 column
     * ```
     */
    index<TKeys extends TColumnKey[]>(...columns: [...TKeys]): IndexBuilder<TKeys> {
      return new IndexBuilder({ columns });
    },
  };
}
