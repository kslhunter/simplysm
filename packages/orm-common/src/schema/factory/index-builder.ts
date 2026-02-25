// ============================================
// IndexBuilder
// ============================================

/**
 * Index definition builder
 *
 * Fluent API를 통해 Index의 column, 유니크 여부, sorting 순서를 definition
 * TableBuilder.indexes()used in
 *
 * @template TKeys - Index column key array type
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
 * @see {@link createIndexFactory} Index factory
 * @see {@link TableBuilder} Table builder
 */
export class IndexBuilder<TKeys extends string[]> {
  /**
   * @param meta - Index Metadata
   * @param meta.columns - Index column array
   * @param meta.name - Index 이름 (Select)
   * @param meta.unique - 유니크 Index 여부
   * @param meta.orderBy - Column별 sorting order
   * @param meta.description - Index description
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
   * Index set name
   *
   * @param name - Index 이름
   * @returns new IndexBuilder instance
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
   * @returns new IndexBuilder instance
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
   * 각 column에 대해 ASC 또는 DESC 지정
   *
   * @param orderBy - Column별 sorting order (column 수와 동일해야 함)
   * @returns new IndexBuilder instance
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
   * Index set description
   *
   * @param description - Index description (DDL Comment으로 사용)
   * @returns new IndexBuilder instance
   */
  description(description: string): IndexBuilder<TKeys> {
    return new IndexBuilder({ ...this.meta, description });
  }
}

// ============================================
// IndexFactory
// ============================================

/**
 * Index builder factory Generate
 *
 * TableBuilder.indexes()used in하는 Index factory
 *
 * @template TColumnKey - Table column key type
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
     * @template TKeys - Index column key array type
     * @param columns - Index column명들
     * @returns IndexBuilder instance
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
