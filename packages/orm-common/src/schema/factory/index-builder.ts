// ============================================
// IndexBuilder
// ============================================

/**
 * 인덱스 정의 빌더
 *
 * Fluent API를 통해 인덱스의 컬럼, 유니크 여부, 정렬 순서를 정의
 * TableBuilder.indexes()에서 사용
 *
 * @template TKeys - 인덱스 컬럼 키 배열 타입
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
 *     // 유니크 인덱스
 *     i.index("email").unique(),
 *
 *     // 복합 인덱스 + 정렬 순서
 *     i.index("name", "createdAt").orderBy("ASC", "DESC"),
 *
 *     // 커스텀 이름
 *     i.index("createdAt").name("IX_User_CreatedAt"),
 *   ]);
 * ```
 *
 * @see {@link createIndexFactory} 인덱스 팩토리
 * @see {@link TableBuilder} 테이블 빌더
 */
export class IndexBuilder<TKeys extends string[]> {
  /**
   * @param meta - 인덱스 메타데이터
   * @param meta.columns - 인덱스 컬럼 배열
   * @param meta.name - 인덱스 이름 (선택)
   * @param meta.unique - 유니크 인덱스 여부
   * @param meta.orderBy - 컬럼별 정렬 순서
   * @param meta.description - 인덱스 설명
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
   * 인덱스 이름 설정
   *
   * @param name - 인덱스 이름
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
   * 유니크 인덱스 설정
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
   * 각 컬럼에 대해 ASC 또는 DESC 지정
   *
   * @param orderBy - 컬럼별 정렬 순서 (컬럼 수와 동일해야 함)
   * @returns 새 IndexBuilder 인스턴스
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
   * 인덱스 설명 설정
   *
   * @param description - 인덱스 설명 (DDL 주석으로 사용)
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
 * 인덱스 빌더 팩토리 생성
 *
 * TableBuilder.indexes()에서 사용하는 인덱스 팩토리
 *
 * @template TColumnKey - 테이블 컬럼 키 타입
 * @returns 인덱스 생성 메서드를 포함한 객체
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
 * @see {@link IndexBuilder} 인덱스 빌더 클래스
 */
export function createIndexFactory<TColumnKey extends string>() {
  return {
    /**
     * 인덱스 생성
     *
     * @template TKeys - 인덱스 컬럼 키 배열 타입
     * @param columns - 인덱스 컬럼명들
     * @returns IndexBuilder 인스턴스
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
