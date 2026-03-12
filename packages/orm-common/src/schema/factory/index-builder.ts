// ============================================
// IndexBuilder
// ============================================

/**
 * Index definition builder
 *
 * Define Index columns, uniqueness, and sort order via Fluent API
 * Used in TableBuilder.indexes()
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
 *     // Unique index
 *     i.index("email").unique(),
 *
 *     // Composite index + sort order
 *     i.index("name", "createdAt").orderBy("ASC", "DESC"),
 *
 *     // Custom name
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
   * @param meta.name - Index name (optional)
   * @param meta.unique - Whether it is a unique index
   * @param meta.orderBy - Sort order per column
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
   * @param name - Index name
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
   * Unique index configuration
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
   * Sort order configuration
   *
   * Specify ASC or DESC for each column
   *
   * @param orderBy - Sort order per column (must match the number of columns)
   * @returns new IndexBuilder instance
   *
   * @example
   * ```typescript
   * // Single column
   * i.index("createdAt").orderBy("DESC")
   *
   * // Composite column
   * i.index("status", "createdAt").orderBy("ASC", "DESC")
   * ```
   */
  orderBy(...orderBy: { [K in keyof TKeys]: "ASC" | "DESC" }): IndexBuilder<TKeys> {
    return new IndexBuilder({ ...this.meta, orderBy });
  }

  /**
   * Index set description
   *
   * @param description - Index description (used as DDL Comment)
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
 * Index builder factory creation
 *
 * Index factory used in TableBuilder.indexes()
 *
 * @template TColumnKey - Table column key type
 * @returns Object containing Index creation methods
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
     * @param columns - Index column names
     * @returns IndexBuilder instance
     *
     * @example
     * ```typescript
     * i.index("email")          // Single column
     * i.index("name", "email")  // Composite column
     * ```
     */
    index<TKeys extends TColumnKey[]>(...columns: [...TKeys]): IndexBuilder<TKeys> {
      return new IndexBuilder({ columns });
    },
  };
}
