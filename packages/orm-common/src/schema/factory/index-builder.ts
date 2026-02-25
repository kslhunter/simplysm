// ============================================
// IndexBuilder
// ============================================

/**
 * Index definition builder
 *
 * Fluent API를 통해 Index의 컬럼, 유니크 여부, sorting 순서를 definition
 * TableBuilder.indexes()에서 사용
 *
 * @template TKeys - Index 컬럼 key array type
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
 *     // 유니크 Index
 *     i.index("email").unique(),
 *
 *     // 복합 Index + sorting order
 *     i.index("name", "createdAt").orderBy("ASC", "DESC"),
 *
 *     // 커스텀 이름
 *     i.index("createdAt").name("IX_User_CreatedAt"),
 *   ]);
 * ```
 *
 * @see {@link createIndexFactory} Index 팩토리
 * @see {@link TableBuilder} Table builder
 */
export class IndexBuilder<TKeys extends string[]> {
  /**
   * @param meta - Index Metadata
   * @param meta.columns - Index 컬럼 array
   * @param meta.name - Index 이름 (Select)
   * @param meta.unique - 유니크 Index 여부
   * @param meta.orderBy - Column별 sorting order
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
   * @returns 새 IndexBuilder instance
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
   * 유니크 Index 설정
   *
   * @returns 새 IndexBuilder instance
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
   * sorting order 설정
   *
   * 각 컬럼에 대해 ASC 또는 DESC 지정
   *
   * @param orderBy - Column별 sorting order (컬럼 수와 동일해야 함)
   * @returns 새 IndexBuilder instance
   *
   * @example
   * ```typescript
   * // 단일 컬럼
   * i.index("createdAt").orderBy("DESC")
   *
   * // 복합 컬럼
   * i.index("status", "createdAt").orderBy("ASC", "DESC")
   * ```
   */
  orderBy(...orderBy: { [K in keyof TKeys]: "ASC" | "DESC" }): IndexBuilder<TKeys> {
    return new IndexBuilder({ ...this.meta, orderBy });
  }

  /**
   * Index 설명 설정
   *
   * @param description - Index 설명 (DDL Comment으로 사용)
   * @returns 새 IndexBuilder instance
   */
  description(description: string): IndexBuilder<TKeys> {
    return new IndexBuilder({ ...this.meta, description });
  }
}

// ============================================
// IndexFactory
// ============================================

/**
 * Index builder 팩토리 Generate
 *
 * TableBuilder.indexes()에서 사용하는 Index 팩토리
 *
 * @template TColumnKey - Table 컬럼 key type
 * @returns Index Generate 메서드를 포함한 object
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
 * @see {@link IndexBuilder} Index builder class
 */
export function createIndexFactory<TColumnKey extends string>() {
  return {
    /**
     * Index Generate
     *
     * @template TKeys - Index 컬럼 key array type
     * @param columns - Index 컬럼명들
     * @returns IndexBuilder instance
     *
     * @example
     * ```typescript
     * i.index("email")          // 단일 컬럼
     * i.index("name", "email")  // 복합 컬럼
     * ```
     */
    index<TKeys extends TColumnKey[]>(...columns: [...TKeys]): IndexBuilder<TKeys> {
      return new IndexBuilder({ columns });
    },
  };
}
