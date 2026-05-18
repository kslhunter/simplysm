// 기존 구현 - 카테고리 필드 없음 상태
export interface Book {
  id: string;
  title: string;
  author: string;
  publishedAt: Date;
}

export async function loadBooks(): Promise<Book[]> {
  // 출판일 내림차순 로드
  throw new Error("stub - 테스트 환경 전용");
}

export function searchBooks(keyword: string, books: Book[]): Book[] {
  // 제목·저자 부분일치 (대소문자 무시)
  const lower = keyword.toLowerCase();
  return books.filter(
    (b) =>
      b.title.toLowerCase().includes(lower) ||
      b.author.toLowerCase().includes(lower)
  );
}
