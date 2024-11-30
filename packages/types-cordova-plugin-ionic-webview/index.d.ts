/**
 * Ionic WebView 플러그인
 *
 * Ionic 애플리케이션에서 WebView를 제어하기 위한 인터페이스를 제공합니다.
 * 파일 경로 변환, 서버 기본 경로 설정 및 관리 기능을 포함합니다.
 *
 * @example
 *
 * // 파일 경로 변환
 * const convertedPath = Ionic.WebView.convertFileSrc('file:///path/to/file.jpg');
 *
 * // 서버 기본 경로 설정
 * Ionic.WebView.setServerBasePath('/new/base/path');
 *
 * // 현재 서버 기본 경로 가져오기
 * Ionic.WebView.getServerBasePath((path) => {
 *   console.log('Current base path:', path);
 * });
 *
 * // 서버 기본 경로 영구 저장
 * Ionic.WebView.persistServerBasePath();
 *
 *
 * @remarks
 * - convertFileSrc: 로컬 파일 경로를 WebView에서 사용 가능한 URL로 변환합니다.
 * - setServerBasePath: WebView의 서버 기본 경로를 설정합니다.
 * - getServerBasePath: 현재 설정된 서버 기본 경로를 비동기적으로 가져옵니다.
 * - persistServerBasePath: 현재 서버 기본 경로를 영구적으로 저장합니다.
 */
declare const Ionic: {
  WebView: {
    /** 로컬 파일 경로를 WebView에서 사용 가능한 URL로 변환합니다. */
    convertFileSrc: (url: string) => string;
    /** WebView의 서버 기본 경로를 설정합니다. */
    setServerBasePath: (path: string) => void;
    /** 현재 설정된 서버 기본 경로를 비동기적으로 가져옵니다. */
    getServerBasePath: (callback: (r: string) => void) => void;
    /** 현재 서버 기본 경로를 영구적으로 저장합니다. */
    persistServerBasePath: () => void;
  };
};
